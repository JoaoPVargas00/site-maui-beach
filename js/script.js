/* Apenas interações. Fotos, vídeos, títulos e links são editados em index.html. */
(() => {
  "use strict";
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [
    ...parent.querySelectorAll(selector),
  ];
  $("#year").textContent = new Date().getFullYear();
  // Menu acessível e cabeçalho fixo.
  const header = $("header"),
    menu = $("#main-menu"),
    toggle = $(".menu-toggle");
  function setMenu(open) {
    menu.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    updateHeader();
  }
  function updateHeader() {
    header.classList.toggle(
      "solid",
      scrollY > 30 || menu.classList.contains("is-open"),
    );
  }
  toggle.addEventListener("click", () =>
    setMenu(toggle.getAttribute("aria-expanded") !== "true"),
  );
  $$("a", menu).forEach((a) =>
    a.addEventListener("click", () => setMenu(false)),
  );
  window.addEventListener("scroll", updateHeader, { passive: true });
  window.addEventListener("resize", () => {
    if (innerWidth > 800) setMenu(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("is-open")) {
      setMenu(false);
      toggle.focus();
    }
  });
  updateHeader();

  // Filtros: apenas ocultam os botões existentes no HTML.
  const gallery = $$(".gallery-item", $("#gallery-grid"));
  let visiblePhotos = [...gallery],
    photoIndex = 0;
  function filterPhotos(category) {
    gallery.forEach(
      (card) =>
        (card.hidden =
          category !== "Todos" && card.dataset.category !== category),
    );
    visiblePhotos = gallery.filter((card) => !card.hidden);
    $("#gallery-empty").hidden = visiblePhotos.length > 0;
    $$("[data-filter]").forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.filter === category),
      ),
    );
  }
  $$("[data-filter]").forEach((button) =>
    button.addEventListener("click", () => filterPhotos(button.dataset.filter)),
  );
  $$(".inspiration").forEach((link) =>
    link.addEventListener("click", () => filterPhotos(link.dataset.category)),
  );

  // O lightbox lê o src da foto clicada. Não há cadastro de imagens no JavaScript.
  const modal = $("#media-modal");
  let previousFocus = null,
    previousOverflow = "";
  function openDialog(dialog) {
    previousFocus = document.activeElement;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
  }
  $$("dialog").forEach((dialog) => {
    $("[data-close]", dialog).addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        dialog.close();
    });
    dialog.addEventListener("close", () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    });
  });
  function showPhoto(index) {
    if (!visiblePhotos.length) return;
    photoIndex = (index + visiblePhotos.length) % visiblePhotos.length;
    const source = $("img", visiblePhotos[photoIndex]);
    $("#lightbox-image").src = source.getAttribute("src");
    $("#lightbox-image").alt = source.alt;
    $("#lightbox-caption").textContent = source.alt;
    $("#lightbox-counter").textContent =
      photoIndex + 1 + " / " + visiblePhotos.length;
  }
  gallery.forEach((card) =>
    card.addEventListener("click", () => {
      showPhoto(visiblePhotos.indexOf(card));
      openDialog(modal);
    }),
  );
  $$("[data-step]").forEach((button) =>
    button.addEventListener("click", () =>
      showPhoto(photoIndex + Number(button.dataset.step)),
    ),
  );
  modal.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      showPhoto(photoIndex + (event.key === "ArrowRight" ? 1 : -1));
    }
  });
  $("#privacy-open").addEventListener("click", () =>
    openDialog($("#privacy-modal")),
  );

  // Players HTML5 funcionam sem JavaScript. Aqui só evitamos som simultâneo.
  const players = $$("video");
  players.forEach((video) => {
    video.addEventListener("play", () =>
      players.forEach((other) => {
        if (other !== video && !other.paused) other.pause();
      }),
    );
    video.addEventListener("error", () => {
      const notice = $(".video-error", video.closest(".video-card"));
      if (notice) notice.hidden = false;
    });
    video.addEventListener("loadeddata", () => {
      const notice = $(".video-error", video.closest(".video-card"));
      if (notice) notice.hidden = true;
    });
  });

  // Telefone e mensagem inicial ficam nos atributos data-* do formulário HTML.
  const form = $("#contact-form");
  const today = new Date();
  form.elements.date.min = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  for (const field of ["phone", "name"])
    form.elements[field].addEventListener("input", () =>
      form.elements[field].setCustomValidity(""),
    );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const digits = data.phone.replace(/\D/g, "");
    form.elements.phone.setCustomValidity(
      digits.length < 10 || digits.length > 15
        ? "Informe um telefone válido com DDD."
        : "",
    );
    form.elements.name.setCustomValidity(
      data.name.trim().length < 2 ? "Informe seu nome." : "",
    );
    if (!form.reportValidity()) return;
    const message = [
      form.dataset.message,
      "",
      "Nome: " + data.name.trim(),
      "Telefone: " + data.phone,
      "E-mail: " + data.email,
      "Evento: " + data.type,
      "Data prevista: " +
        (data.date ? data.date.split("-").reverse().join("/") : "A definir"),
      "Convidados: " + (data.guests || "A definir"),
      "Mensagem: " +
        (data.message.trim() || "Gostaria de consultar disponibilidade."),
    ].join("\n");
    const url = new URL(form.dataset.whatsapp);
    url.searchParams.set("text", message);
    $("#form-whatsapp").href = url.href;
    $("#form-ready").hidden = false;
    window.open(url.href, "_blank", "noopener,noreferrer");
  });
  // Animações nativas, sem dependências, respeitando movimento reduzido.
  if (
    "IntersectionObserver" in window &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.animate(
              [
                { opacity: 0, transform: "translateY(18px)" },
                { opacity: 1, transform: "translateY(0)" },
              ],
              { duration: 600, easing: "ease-out" },
            );
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.1 },
    );
    $$(".reveal").forEach((el) => observer.observe(el));
  }
})();
