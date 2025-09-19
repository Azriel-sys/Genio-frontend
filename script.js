document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("chat-form");
  const input = document.getElementById("user-input");
  const chatBox = document.getElementById("chat-box");
  const sendBtn = document.getElementById("send-btn");
  const fileContainer = document.getElementById("file-upload-container");

  // State untuk file yang akan diupload
  let files = [];

  // Base URL untuk backend API
  // Gunakan relative path agar otomatis cocok di Vercel ("/api" jika pakai API routes, atau root jika custom server)
  const API_BASE_URL =
    window.location.hostname === "localhost" ? "http://localhost:3000" : "";

  // Event listener untuk form submission
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const userMessage = input.value.trim();
    if (!userMessage && files.length === 0) return;

    // Buat salinan files sebelum dikosongkan
    const attachedFiles = files.slice();

    // Tambahkan pesan pengguna ke chat
    appendMessage("user", userMessage, attachedFiles);

    // Kosongkan input
    input.value = "";
    files = [];
    updateFileDisplay();

    // Tampilkan indikator typing
    const typingIndicator = appendTypingIndicator();

    try {
      let response;

      if (attachedFiles.length > 0) {
        // Jika ada file, gunakan endpoint yang sesuai
        const file = attachedFiles[0];
        let endpoint;

        if (file.type.startsWith("image/")) {
          endpoint = "/generate-image";
        } else if (file.type.startsWith("audio/")) {
          endpoint = "/generate-audio";
        } else if (file.type === "application/pdf") {
          endpoint = "/generate-pdf";
        } else {
          endpoint = "/generate-text";
        }

        const formData = new FormData();
        formData.append("file", file);
        // Selalu kirim field message, meski kosong
        formData.append("message", userMessage || "");

        response = await fetch(API_BASE_URL + endpoint, {
          method: "POST",
          body: formData,
        });
      } else {
        // Jika hanya teks
        response = await fetch(API_BASE_URL + "/generate-text", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: userMessage }),
        });
      }

      const data = await response.json();

      // Hapus indikator typing
      chatBox.removeChild(typingIndicator);

      if (response.ok) {
        // Tambahkan respons dari bot
        appendMessage("bot", data.reply);
      } else {
        appendMessage("bot", "Error: " + (data.error || "Terjadi kesalahan"));
      }
    } catch (error) {
      console.error("Error:", error);
      chatBox.removeChild(typingIndicator);
      appendMessage(
        "bot",
        "Maaf, terjadi kesalahan koneksi. Pastikan server backend berjalan di localhost:3000"
      );
    }
  });

  // Fungsi untuk menambahkan pesan ke chat
  function appendMessage(sender, text, attachedFiles = []) {
    const msg = document.createElement("div");
    msg.classList.add("message", sender);

    // Tambahkan konten teks
    if (text) {
      const textNode = document.createElement("div");
      textNode.textContent = text;
      msg.appendChild(textNode);
    }

    // Tambahkan info file jika ada
    if (attachedFiles.length > 0) {
      const fileInfo = document.createElement("div");
      fileInfo.style.marginTop = "8px";
      fileInfo.style.fontSize = "14px";
      fileInfo.style.opacity = "0.8";

      attachedFiles.forEach((file) => {
        const fileDiv = document.createElement("div");
        fileDiv.textContent = `📎 ${file.name} (${formatFileSize(file.size)})`;
        fileInfo.appendChild(fileDiv);
      });

      msg.appendChild(fileInfo);
    }

    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;

    return msg;
  }

  // Fungsi untuk menambahkan indikator typing
  function appendTypingIndicator() {
    const typing = document.createElement("div");
    typing.classList.add("message", "bot", "typing");

    const text = document.createElement("span");
    text.textContent = "Gemini sedang mengetik";

    const dots = document.createElement("div");
    dots.style.display = "flex";
    dots.style.gap = "4px";
    dots.innerHTML =
      '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';

    typing.appendChild(text);
    typing.appendChild(dots);

    chatBox.appendChild(typing);
    chatBox.scrollTop = chatBox.scrollHeight;

    return typing;
  }

  // Fungsi untuk memformat ukuran file
  function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // Tambahkan event listener untuk input file (dengan createElement)
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.multiple = true;
  fileInput.accept = "image/*,audio/*,.pdf";
  fileInput.style.display = "none";

  const uploadButton = document.createElement("button");
  uploadButton.type = "button";
  uploadButton.classList.add("upload-btn");
  uploadButton.textContent = "Unggah File";
  uploadButton.addEventListener("click", () => fileInput.click());

  fileContainer.appendChild(uploadButton);
  document.body.appendChild(fileInput);

  fileInput.addEventListener("change", function () {
    for (let i = 0; i < this.files.length; i++) {
      files.push(this.files[i]);
    }
    updateFileDisplay();
    this.value = ""; // Reset input file
  });

  // Fungsi untuk memperbarui tampilan file
  function updateFileDisplay() {
    // Hapus tampilan file sebelumnya
    while (fileContainer.children.length > 1) {
      fileContainer.removeChild(fileContainer.lastChild);
    }

    // Tambahkan file yang dipilih
    files.forEach((file, index) => {
      const fileItem = document.createElement("div");
      fileItem.classList.add("file-item");

      let icon = "📄";
      if (file.type.startsWith("image/")) icon = "🖼️";
      else if (file.type.startsWith("audio/")) icon = "🎵";
      else if (file.type === "application/pdf") icon = "📝";

      fileItem.innerHTML = `
                        ${icon} ${file.name} 
                        <button type="button" onclick="removeFile(${index})">✕</button>
                    `;

      fileContainer.appendChild(fileItem);
    });
  }

  // Fungsi untuk menghapus file (dibuat global agar bisa dipanggil dari onclick)
  window.removeFile = function (index) {
    files.splice(index, 1);
    updateFileDisplay();
  };
});
