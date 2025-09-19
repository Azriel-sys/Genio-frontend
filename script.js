document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("chat-form");
  const input = document.getElementById("user-input");
  const chatBox = document.getElementById("chat-box");
  const sendBtn = document.getElementById("send-btn");
  const fileContainer = document.getElementById("file-upload-container");

  // State untuk file yang akan diupload (hanya 1 file)
  let file = null;

  // Base URL untuk backend API
  const API_BASE_URL =
    window.location.hostname === "localhost"
      ? "http://localhost:3000"
      : "https://genio-teal.vercel.app";

  // Event listener untuk form submission
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const userMessage = input.value.trim();
    if (!userMessage && !file) return;

    // Buat salinan file sebelum reset
    const attachedFile = file;

    // Tambahkan pesan pengguna ke chat
    appendMessage("user", userMessage, attachedFile ? [attachedFile] : []);

    // Kosongkan input dan file
    input.value = "";
    file = null;
    updateFileDisplay();

    // Tampilkan indikator typing
    const typingIndicator = appendTypingIndicator();

    try {
      let response;

      if (attachedFile) {
        let endpoint;
        if (attachedFile.type.startsWith("image/")) {
          endpoint = "/generate-image";
        } else if (attachedFile.type.startsWith("audio/")) {
          endpoint = "/generate-audio";
        } else if (attachedFile.type === "application/pdf") {
          endpoint = "/generate-pdf";
        } else {
          endpoint = "/generate-text";
        }

        const formData = new FormData();
        formData.append("file", attachedFile);
        formData.append("message", userMessage || "");

        response = await fetch(API_BASE_URL + endpoint, {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch(API_BASE_URL + "/generate-text", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: userMessage }),
        });
      }

      const data = await response.json();
      chatBox.removeChild(typingIndicator);

      if (response.ok && data.success !== false) {
        appendMessage("bot", data.reply);
      } else {
        appendMessage("bot", "❌ " + (data.error || "Terjadi kesalahan"));
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

    if (text) {
      const textNode = document.createElement("div");
      textNode.textContent = text;
      msg.appendChild(textNode);
    }

    if (attachedFiles.length > 0) {
      const fileInfo = document.createElement("div");
      fileInfo.style.marginTop = "8px";
      fileInfo.style.fontSize = "14px";
      fileInfo.style.opacity = "0.8";

      attachedFiles.forEach((f) => {
        const fileDiv = document.createElement("div");
        fileDiv.textContent = `📎 ${f.name} (${formatFileSize(f.size)})`;
        fileInfo.appendChild(fileDiv);
      });

      msg.appendChild(fileInfo);
    }

    chatBox.appendChild(msg);
    requestAnimationFrame(() => {
      chatBox.scrollTop = chatBox.scrollHeight;
    });

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

  // Fungsi format ukuran file
  function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // Input file (1 file saja)
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.multiple = false; // hanya 1 file
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
    file = this.files[0] || null;
    updateFileDisplay();
    this.value = ""; // reset input
  });

  // Fungsi update tampilan file
  function updateFileDisplay() {
    while (fileContainer.children.length > 1) {
      fileContainer.removeChild(fileContainer.lastChild);
    }

    if (file) {
      const fileItem = document.createElement("div");
      fileItem.classList.add("file-item");

      let icon = "📄";
      if (file.type.startsWith("image/")) icon = "🖼️";
      else if (file.type.startsWith("audio/")) icon = "🎵";
      else if (file.type === "application/pdf") icon = "📝";

      // pakai textContent untuk cegah XSS
      const fileName = document.createElement("span");
      fileName.textContent = `${icon} ${file.name}`;

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.textContent = "✕";
      removeBtn.addEventListener("click", () => {
        file = null;
        updateFileDisplay();
      });

      fileItem.appendChild(fileName);
      fileItem.appendChild(removeBtn);
      fileContainer.appendChild(fileItem);
    }
  }
});
