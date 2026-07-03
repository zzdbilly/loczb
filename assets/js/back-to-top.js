// 返回顶部按钮
// Back to Top button
    const backToTop = document.getElementById("backToTop");
    window.addEventListener("scroll", () => {
      if (window.scrollY > 300) {
        backToTop.classList.add("visible");
      } else {
        backToTop.classList.remove("visible");
      }
      // Reading progress for blog posts
      const progressBar = document.getElementById("readingProgress");
      if (progressBar && document.querySelector(".post-content")) {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = (scrollTop / docHeight) * 100;
        progressBar.style.width = progress + "%";
      }
    });
    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "j") {
        window.scrollBy({ top: 200, behavior: "smooth" });
      } else if (e.key === "k") {
        window.scrollBy({ top: -200, behavior: "smooth" });
      } else if (e.key === "/") {
        e.preventDefault();
        const searchInput = document.getElementById("blog-search-input");
        if (searchInput) searchInput.focus();
      } else if (e.key === "Escape") {
        const searchResults = document.getElementById("blog-search-results");
        if (searchResults) searchResults.classList.remove("active");
      }
    });
