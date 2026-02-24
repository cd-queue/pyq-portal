// This part copy from firbase as a SDK

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.local.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// elements store in variables
const uploadBtn = document.getElementById("uploadBtn");
const searchBtn = document.getElementById("searchBtn");
const uploadSubjectInput = document.getElementById("uploadSubject");
const uploadYearInput = document.getElementById("uploadYear");
const fileInput = document.getElementById("fileInput");
const subjectSelect = document.getElementById("subject");
const yearSelect = document.getElementById("year");
const resultsDiv = document.getElementById("results");

// text convert to lower case and removed extra spaces
function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

// reset dropdown 
function resetFilterOptions() {
  subjectSelect.innerHTML = '<option value="">Select Subject</option>';
  yearSelect.innerHTML = '<option value="">Select Year</option>';
}

// convert pdf to base64
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}


// fetching data from firbase database in  a new array and return it
async function fetchPapers() {
  const snapshot = await getDocs(collection(db, "papers"));
  return snapshot.docs.map((docSnapshot) => docSnapshot.data());
}


async function loadFilters() {
  resetFilterOptions();

  try {
    const papers = await fetchPapers();
    const subjects = new Set();
    const years = new Set();

    papers.forEach((paper) => {
      if (paper.subject) subjects.add(String(paper.subject).trim());
      if (paper.year) years.add(String(paper.year).trim());
    });

    [...subjects]
      .sort((a, b) => a.localeCompare(b))
      .forEach((subject) => {
        const option = document.createElement("option");
        option.value = subject;
        option.textContent = subject;
        subjectSelect.appendChild(option);
      });

    [...years]
      .sort((a, b) => Number(b) - Number(a) || b.localeCompare(a))
      .forEach((year) => {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
      });
  } catch (error) {
    console.error("Failed to load filters:", error);
  }
}

uploadBtn.addEventListener("click", async () => {
  const subject = uploadSubjectInput.value.trim();
  const year = uploadYearInput.value.trim();
  const file = fileInput.files[0];

  if (!subject || !year || !file) {
    alert("Please fill all fields and select a PDF.");
    return;
  }

  if (file.type !== "application/pdf") {
    alert("Only PDF files are allowed.");
    return;
  }

  try {
    const base64 = await toBase64(file);

    await addDoc(collection(db, "papers"), {
      subject,
      year,
      fileData: base64
    });

    alert("Upload successful!");
    uploadSubjectInput.value = "";
    uploadYearInput.value = "";
    fileInput.value = "";
    await loadFilters();
  } catch (error) {
    console.error("Upload failed:", error);
    alert("Upload failed!");
  }
});

searchBtn.addEventListener("click", async () => {
  const selectedSubject = normalizeText(subjectSelect.value);
  const selectedYear = normalizeText(yearSelect.value);

  resultsDiv.innerHTML = "";

  try {
    const papers = await fetchPapers();

    const matched = papers.filter((paper) => {
      const paperSubject = normalizeText(paper.subject);
      const paperYear = normalizeText(paper.year);

      const subjectMatch = !selectedSubject || paperSubject === selectedSubject;
      const yearMatch = !selectedYear || paperYear === selectedYear;

      return subjectMatch && yearMatch;
    });

    if (matched.length === 0) {
      resultsDiv.textContent = "No papers found.";
      return;
    }

    matched.forEach((paper) => {
      const button = document.createElement("button");
      button.textContent = `${paper.subject} - ${paper.year} Download`;
      button.addEventListener("click", () => {
        const link = document.createElement("a");
        link.href = paper.fileData;
        link.download = "question-paper.pdf";
        link.click();
      });
      resultsDiv.appendChild(button);
    });
  } catch (error) {
    console.error("Search failed:", error);
    resultsDiv.textContent = "Search failed. Check console and Firestore rules.";
  }
});

loadFilters();
