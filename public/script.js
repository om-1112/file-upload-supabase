// 📤 Upload file
async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const productId = document.getElementById('productId').value;

    if (!fileInput.files.length || !productId) {
        alert("Please select a file and enter Application Code.");
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    formData.append("product_id", productId);

    try {
        const res = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        const data = await res.json();
        alert(data.msg || "Upload finished");
    } catch (err) {
        console.error("Upload error:", err);
        alert("Upload failed");
    }
}

// 🔍 Search files by Application Code
async function searchFiles() {
    const query = document.getElementById('searchBox').value.trim();
    if (!query) {
        alert("Enter Application Code to search");
        return;
    }

    try {
        const res = await fetch(`/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        const resultsDiv = document.getElementById("results");
        resultsDiv.innerHTML = "";

        if (data.results.length === 0) {
            resultsDiv.innerHTML = "<p>No files found.</p>";
            return;
        }

        data.results.forEach(file => {
            const div = document.createElement("div");
            div.className = "file-item";
            div.innerHTML = `
                <strong>${file.filename}</strong> | Application Code: ${file.product_id}
                <button onclick="downloadFile(${file.id})">Download</button>
            `;
            resultsDiv.appendChild(div);
        });
    } catch (err) {
        console.error("Search error:", err);
        alert("Search failed");
    }
}

// 📥 Download file using signed URL
async function downloadFile(id) {
    try {
        const res = await fetch(`/download/${id}`);
        const data = await res.json();

        if (data.downloadUrl) {
            // open signed URL in new tab
            window.open(data.downloadUrl, "_blank");
        } else {
            alert("Download link error");
        }
    } catch (err) {
        console.error("Download error:", err);
        alert("Download failed");
    }
}
