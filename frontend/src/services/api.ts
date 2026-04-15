const API_BASE_URL = "http://127.0.0.1:8000";

// ✅ Updated: Added userId to handle multi-user isolation
export const askQuestion = async (query: string, userId: string = "Rishu_Admin") => {
  console.log("🚀 SENDING QUERY TO:", `${API_BASE_URL}/ask?query=${query}&user_id=${userId}`);
  
  try {
    // 💡 user_id ko query param mein add kiya
    const response = await fetch(`${API_BASE_URL}/ask?query=${encodeURIComponent(query)}&user_id=${userId}`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ BACKEND ERROR:", errorText);
      throw new Error(`Server Error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("🌐 FETCH FAILED:", error);
    throw error;
  }
};

// services/api.ts
export const uploadPDF = async (file: File, userId: string) => {
  const formData = new FormData();
  formData.append("file", file);
  // user_id query param mein sahi ja raha hai ✅
  const response = await fetch(`${API_BASE_URL}/upload-pdf?user_id=${userId}`, {
    method: "POST",
    body: formData,
  });
  return response.json();
};

// ✅ Website URL Upload
export const uploadURL = async (url: string, userId: string) => {
  const response = await fetch(`${API_BASE_URL}/upload-url?user_id=${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }), // Body mein {url: "..."} bhejna sahi hai ✅
  });
  return response.json();
};

// ✅ YouTube Video Upload
export const uploadVideo = async (url: string, userId: string) => {
  const response = await fetch(`${API_BASE_URL}/upload-video?user_id=${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return response.json();
};

// ❌ Fixed: Needs user_id to fetch the right library
export const getSources = async (userId: string = "Rishu_Admin") => {
  const response = await fetch(`${API_BASE_URL}/sources?user_id=${userId}`);
  return response.json();
};

// ❌ Fixed: Needs user_id to ensure you only delete your own file
export const deleteSource = async (sourceName: string, userId: string) => {
  // Encode source name taaki '/' ya ':' URL kharab na karein
  const encodedSource = encodeURIComponent(sourceName);
  
  const response = await fetch(`${API_BASE_URL}/sources/${encodedSource}?user_id=${userId}`, {
    method: "DELETE",
  });
  
  return response.json();

};