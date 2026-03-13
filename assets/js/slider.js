document.addEventListener('DOMContentLoaded', function() {
    let slides = document.querySelectorAll('.slide');
    let idx = 0;
    function showSlide(i) {
        slides.forEach((s, j) => s.style.display = j === i ? 'block' : 'none');
    }
    if (slides.length > 0) {
        showSlide(idx);
        setInterval(() => {
            idx = (idx + 1) % slides.length;
            showSlide(idx);
        }, 3000);
    }
});
