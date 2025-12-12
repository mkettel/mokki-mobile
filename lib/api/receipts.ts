import { supabase } from "@/lib/supabase/client";
import { Platform } from "react-native";

// Allowed file types for receipts
export const ALLOWED_RECEIPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export type ReceiptFileType = "image" | "pdf";

/**
 * Get file extension from mime type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
  };
  return mimeToExt[mimeType] || "jpg";
}

/**
 * Determine file type category
 */
export function getReceiptFileType(mimeType: string): ReceiptFileType {
  if (mimeType === "application/pdf") {
    return "pdf";
  }
  return "image";
}

/**
 * Validate a file before upload
 */
export function validateReceiptFile(file: {
  mimeType: string;
  fileSize: number;
}): { valid: boolean; error?: string } {
  if (!ALLOWED_RECEIPT_TYPES.includes(file.mimeType)) {
    return {
      valid: false,
      error: "Invalid file type. Please use JPEG, PNG, WebP, or PDF.",
    };
  }

  if (file.fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: "File too large. Maximum size is 10MB.",
    };
  }

  return { valid: true };
}

/**
 * Convert a file URI to base64
 */
async function uriToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove the data:image/xxx;base64, prefix
      const base64Data = base64.split(",")[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Decode base64 to Uint8Array
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Upload a receipt file to Supabase storage
 */
export async function uploadReceipt(
  houseId: string,
  expenseId: string,
  file: {
    uri: string;
    mimeType: string;
    fileSize: number;
  }
): Promise<{
  url: string | null;
  error: Error | null;
}> {
  try {
    // Validate the file
    const validation = validateReceiptFile(file);
    if (!validation.valid) {
      return { url: null, error: new Error(validation.error) };
    }

    // Generate storage path
    const extension = getExtensionFromMimeType(file.mimeType);
    const timestamp = Date.now();
    const storagePath = `${houseId}/${expenseId}/${timestamp}.${extension}`;

    let uploadData: ArrayBuffer | Blob;

    if (Platform.OS === "web") {
      // On web, fetch as blob works fine
      const response = await fetch(file.uri);
      uploadData = await response.blob();
    } else {
      // On native, convert to base64 then to ArrayBuffer
      // This ensures the binary data is properly transferred
      const base64 = await uriToBase64(file.uri);
      uploadData = base64ToArrayBuffer(base64);
    }

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(storagePath, uploadData, {
        contentType: file.mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return { url: null, error: uploadError };
    }

    // Get a signed URL (works for both public and private buckets)
    const { data: urlData, error: urlError } = await supabase.storage
      .from("receipts")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year expiry

    if (urlError || !urlData?.signedUrl) {
      console.error("Error getting signed URL:", urlError);
      // Fallback to public URL
      const { data: publicUrlData } = supabase.storage
        .from("receipts")
        .getPublicUrl(storagePath);
      return { url: publicUrlData.publicUrl, error: null };
    }

    return { url: urlData.signedUrl, error: null };
  } catch (error) {
    console.error("Error uploading receipt:", error);
    return { url: null, error: error as Error };
  }
}

/**
 * Delete a receipt from storage
 */
export async function deleteReceipt(receiptUrl: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    // Extract the storage path from the URL
    // URL format: https://xxx.supabase.co/storage/v1/object/public/receipts/{path}
    const urlParts = receiptUrl.split("/receipts/");
    if (urlParts.length < 2) {
      return { success: false, error: new Error("Invalid receipt URL") };
    }

    const storagePath = urlParts[1];

    const { error } = await supabase.storage
      .from("receipts")
      .remove([storagePath]);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error deleting receipt:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Update expense with receipt URL
 */
export async function updateExpenseReceipt(
  expenseId: string,
  receiptUrl: string | null
): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const { error } = await supabase
      .from("expenses")
      .update({ receipt_url: receiptUrl })
      .eq("id", expenseId);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error updating expense receipt:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Upload receipt and update expense in one operation
 */
export async function uploadReceiptAndUpdateExpense(
  houseId: string,
  expenseId: string,
  file: {
    uri: string;
    mimeType: string;
    fileSize: number;
  }
): Promise<{
  url: string | null;
  error: Error | null;
}> {
  // First upload the receipt
  const { url, error: uploadError } = await uploadReceipt(
    houseId,
    expenseId,
    file
  );

  if (uploadError || !url) {
    return { url: null, error: uploadError };
  }

  // Then update the expense
  const { error: updateError } = await updateExpenseReceipt(expenseId, url);

  if (updateError) {
    // Try to clean up the uploaded file
    await deleteReceipt(url);
    return { url: null, error: updateError };
  }

  return { url, error: null };
}

/**
 * Remove receipt from expense (delete from storage and clear URL)
 */
export async function removeReceiptFromExpense(
  expenseId: string,
  receiptUrl: string
): Promise<{
  success: boolean;
  error: Error | null;
}> {
  // First delete from storage
  const { error: deleteError } = await deleteReceipt(receiptUrl);
  if (deleteError) {
    console.error("Error deleting receipt from storage:", deleteError);
    // Continue anyway to clear the URL
  }

  // Then clear the URL from the expense
  return updateExpenseReceipt(expenseId, null);
}
