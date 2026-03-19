import { firestore, storage } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Uploads a physical file to Firebase Storage and saves its metadata to Firestore.
 * 
 * @param {File} file - The PDF or text file to upload.
 * @param {string} userId - The ID of the user uploading the document.
 * @returns {Promise<string>} - The generated document ID.
 */
export async function uploadTextbook(file, userId) {
  try {
    const fileId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
    
    // 1. Upload to Storage
    const storageRef = ref(storage, `textbooks/${userId}/${fileId}-${file.name}`);
    await uploadBytes(storageRef, file);
    const fileUrl = await getDownloadURL(storageRef);

    // 2. Save Metadata to Firestore
    const docRef = doc(firestore, 'textbooks', fileId);
    await setDoc(docRef, {
      fileName: file.name,
      uploadedBy: userId,
      fileUrl: fileUrl,
      createdAt: serverTimestamp()
    });

    return fileId;
  } catch (error) {
    console.error("[aiService] Error uploading textbook:", error);
    throw error;
  }
}

/**
 * Generates a quiz from a textbook stored in Firebase.
 * 
 * @param {string} fileId - The unique ID of the textbook document in the repository.
 * @param {string} topic - The focus topic of the quiz.
 * @param {string} difficulty - The difficulty level ('Easy', 'Medium', 'Hard').
 * @returns {Promise<Array>} - A promise that resolves to an array of generated quiz questions.
 */
export async function generateQuizFromTextbook(fileId, topic, difficulty = 'Easy') {
  try {
    console.log(`[aiService] Initiating quiz generation for textbook ID: ${fileId}`);
    
    // Step 1: Fetch document metadata from Firestore using fileId
    const docRef = doc(firestore, 'textbooks', fileId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
        throw new Error("Textbook document not found in database.");
    }
    
    const fileUrl = docSnap.data().fileUrl;
    
    // Step 2: Call the local AI backend /api/generate-quiz with the fileUrl
    const response = await fetch('http://localhost:3000/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fileUrl: fileUrl,
            topic: topic,
            difficulty: difficulty
        })
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate quiz from backend.");
    }

    const quizData = await response.json();
    return quizData;

  } catch (error) {
    console.error(`[aiService] Error generating quiz for ${fileId}:`, error);
    throw error;
  }
}
