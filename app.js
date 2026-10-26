import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"
const GROQ_API_KEY = "not-a-real-key" // Replace later
const firebaseConfig = {
    apiKey: "AIzaSyC7uerZ6ZUR4xv0NTZHIoXTulXSEidz6AE",
    authDomain: "cs-scouting.firebaseapp.com",
    projectId: "cs-scouting",
    storageBucket: "cs-scouting.firebasestorage.app",
    messagingSenderId: "912015511152",
    appId: "1:912015511152:web:ed880a38178bf49fcaaeb5"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
let mediaRecorder = null
let audioChunks = []
let isRecording = false
document.addEventListener("DOMContentLoaded", () => {
    const voiceBtn = document.getElementById("voiceBtn")
    const voiceStatus = document.getElementById("voiceStatus")
    const form = document.getElementById("scoutingForm")
    const submitBtn = document.getElementById("submitBtn")
    const submitStatus = document.getElementById("submitStatus")

    voiceBtn.addEventListener("click", async () => {
        if (!isRecording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                mediaRecorder = new MediaRecorder(stream)
                audioChunks = []

                mediaRecorder.ondataavailable = (e) => {
                    audioChunks.push(e.data)
                }

                mediaRecorder.onstop = async () => {
                    voiceStatus.textContent = "Transcribing..."
                    const blob = new Blob(audioChunks, { type: "audio/webm" })
                    await transcribeAndFill(blob)
                }

                mediaRecorder.start()
                isRecording = true
                voiceBtn.textContent = "Stop Recording"
                voiceBtn.classList.add("recording")
                voiceStatus.textContent = "Recording... speak your answers now."
            } catch (err) {
                voiceStatus.textContent = "Mic access denied. Check browser permissions."
            }
        } else {
            mediaRecorder.stop()
            isRecording = false
            voiceBtn.textContent = "Start Recording"
            voiceBtn.classList.remove("recording")
            voiceStatus.textContent = "Processing..."
        }
    })

    async function transcribeAndFill(blob) {
        try {
            const formData = new FormData()
            formData.append("file", blob, "audio.webm")
            formData.append("model", "whisper-large-v3")

            const transcribeRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${GROQ_API_KEY}` },
                body: formData
            })

            const transcribeData = await transcribeRes.json()
            const transcript = transcribeData.text
            voiceStatus.textContent = "Parsing answers..."

            const parseRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [{
                        role: "user",
                        content: `Extract the following areas from this transcript and return ONLY a valid JSON object witout extra text that corresponds to each area:
{
  "teamNumber": "",
  "scouter": "",
  "submittedImpact": "",
  "wonImpact": "",
  "keyInitiatives": "",
  "longestInitiative": "",
  "plannedEvents": "",
  "inclusivity": "",
  "futureGoals": "",
  "sustainability": "",
  "notes": ""
}
Transcript: ${transcript}`
                    }]
                })
            })
            const parseData = await parseRes.json()
            const parsed = JSON.parse(parseData.choices[0].message.content)
            if (parsed.teamNumber) document.getElementById("teamNumber").value = parsed.teamNumber
            if (parsed.scouter) document.getElementById("scouter").value = parsed.scouter
            if (parsed.submittedImpact) document.getElementById("submittedImpact").value = parsed.submittedImpact
            if (parsed.wonImpact) document.getElementById("wonImpact").value = parsed.wonImpact
            if (parsed.keyInitiatives) document.getElementById("keyInitiatives").value = parsed.keyInitiatives
            if (parsed.longestInitiative) document.getElementById("longestInitiative").value = parsed.longestInitiative
            if (parsed.plannedEvents) document.getElementById("plannedEvents").value = parsed.plannedEvents
            if (parsed.inclusivity) document.getElementById("inclusivity").value = parsed.inclusivity
            if (parsed.futureGoals) document.getElementById("futureGoals").value = parsed.futureGoals
            if (parsed.sustainability) document.getElementById("sustainability").value = parsed.sustainability
            if (parsed.notes) document.getElementById("notes").value = parsed.notes
            voiceStatus.textContent = "✓ Form filled! Review and submit."
        } catch (err) {
            voiceStatus.textContent = "Error processing audio. Try again."
            console.error(err)
        }
    }
    form.addEventListener("submit", async (e) => {
        e.preventDefault()
        submitBtn.disabled = true
        submitBtn.textContent = "Saving..."
        submitStatus.textContent = ""
        try {
            await addDoc(collection(db, "teams"), {
                teamNumber: document.getElementById("teamNumber").value,
                scouter: document.getElementById("scouter").value,
                submittedImpact: document.getElementById("submittedImpact").value,
                wonImpact: document.getElementById("wonImpact").value,
                keyInitiatives: document.getElementById("keyInitiatives").value,
                longestInitiative: document.getElementById("longestInitiative").value,
                plannedEvents: document.getElementById("plannedEvents").value,
                inclusivity: document.getElementById("inclusivity").value,
                futureGoals: document.getElementById("futureGoals").value,
                sustainability: document.getElementById("sustainability").value,
                notes: document.getElementById("notes").value,
                savedAt: new Date().toISOString()
            })
            submitStatus.textContent = "✓ Submitted successfully!"
            form.reset()
        } catch (err) {
            submitStatus.style.color = "#D72638"
            submitStatus.textContent = "Error saving. Check console."
            console.error("Firebase error:", err)
        }
        submitBtn.disabled = false
        submitBtn.textContent = "Submit Scouting Data"
    })

})
