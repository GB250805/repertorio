(function () {
  const modal = document.getElementById("pdf-modal");
  const docViewer = document.getElementById("pdf-viewer");
  const docTitle = document.getElementById("doc-title");
  const pdfContainer = document.querySelector(".pdf-container");
  const scoreGrid = document.querySelector(".score-grid");
  const sortSelect = document.getElementById("sort-select");
  const songsData = Array.isArray(window.SONGS_DATA) ? window.SONGS_DATA : [];

  let scrollY = 0;
  let loadToken = 0;
  let loadTimeoutId = null;
  let observador = null;

  function normalizeGoogleDocUrl(url) {
    if (!url) return "";

    if (url.includes("/preview")) {
      return url;
    }

    if (url.includes("/document/d/") && url.includes("/edit")) {
      return url.replace(/\/edit.*$/, "/preview");
    }

    return url;
  }

  function lockBodyScroll() {
    scrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.position = "fixed";
    document.body.style.top = "-" + scrollY + "px";
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
  }

  function unlockBodyScroll() {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    document.body.style.overflow = "";
    window.scrollTo(0, scrollY);
  }

  function setLoadingState() {
    modal.classList.remove("ready", "has-error");
    pdfContainer.classList.add("loading");
  }

  function setReadyState() {
    modal.classList.add("ready");
    modal.classList.remove("has-error");
    pdfContainer.classList.remove("loading");
  }

  function setErrorState() {
    modal.classList.remove("ready");
    modal.classList.add("has-error");
    pdfContainer.classList.add("loading");
  }

  function clearPendingLoad() {
    if (loadTimeoutId) {
      clearTimeout(loadTimeoutId);
      loadTimeoutId = null;
    }
  }

  function compareText(a, b, direction) {
    return direction === "asc"
      ? a.localeCompare(b, "es", { sensitivity: "base" })
      : b.localeCompare(a, "es", { sensitivity: "base" });
  }

  function sortSongs(list, sortValue) {
    const copy = list.slice();
    const [field, direction] = (sortValue || "title-asc").split("-");

    return copy.sort(function (songA, songB) {
      if (field === "artist") {
        const byArtist = compareText(
          songA.artist || "",
          songB.artist || "",
          direction,
        );
        if (byArtist !== 0) return byArtist;
        return compareText(songA.title || "", songB.title || "", "asc");
      }

      const byTitle = compareText(
        songA.title || "",
        songB.title || "",
        direction,
      );
      if (byTitle !== 0) return byTitle;
      return compareText(songA.artist || "", songB.artist || "", "asc");
    });
  }

  function crearTarjetaCancion(cancion) {
    const card = document.createElement("div");
    card.className = "score-card";

    const link = document.createElement("a");
    link.href = "#";
    link.className = "card-link";
    link.addEventListener("click", function (event) {
      event.preventDefault();
      window.abrirDoc(cancion.title, cancion.url);
    });

    const title = document.createElement("h4");
    title.textContent = cancion.title || "Cancion sin titulo";

    const artist = document.createElement("p");
    artist.textContent =
      "Cover de " + (cancion.artist || "Artista no especificado");

    link.appendChild(title);
    link.appendChild(artist);
    card.appendChild(link);

    return card;
  }

  function aplicarAnimacionTarjetas(tarjetas) {
    if (observador) {
      observador.disconnect();
    }

    tarjetas.forEach(function (tarjeta) {
      tarjeta.style.opacity = "0";
      tarjeta.style.transform = "translateY(30px)";
      tarjeta.style.transition =
        "all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
    });

    observador = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (entrada, index) {
          if (!entrada.isIntersecting) return;

          setTimeout(function () {
            entrada.target.style.opacity = "1";
            entrada.target.style.transform = "translateY(0)";
          }, index * 50);

          observador.unobserve(entrada.target);
        });
      },
      { threshold: 0.1 },
    );

    tarjetas.forEach(function (tarjeta) {
      observador.observe(tarjeta);
    });
  }

  function renderSongs() {
    if (!scoreGrid) return;

    const orden = sortSelect ? sortSelect.value : "title-asc";
    const sortedSongs = sortSongs(songsData, orden);

    scoreGrid.innerHTML = "";

    sortedSongs.forEach(function (cancion) {
      scoreGrid.appendChild(crearTarjetaCancion(cancion));
    });

    const tarjetas = scoreGrid.querySelectorAll(".score-card");
    aplicarAnimacionTarjetas(Array.from(tarjetas));
  }

  window.abrirDoc = function abrirDoc(titulo, enlaceGoogleDoc) {
    if (!enlaceGoogleDoc || enlaceGoogleDoc.includes("PonerLinkDeGoogleDoc")) {
      alert(
        "Este documento aun no esta configurado. Por favor, contacta al administrador.",
      );
      return;
    }

    const currentToken = ++loadToken;
    const cleanUrl = normalizeGoogleDocUrl(enlaceGoogleDoc);

    docTitle.textContent = titulo || "Partitura";
    setLoadingState();
    modal.classList.add("active");
    lockBodyScroll();

    clearPendingLoad();

    docViewer.onload = function () {
      if (currentToken !== loadToken) return;
      clearPendingLoad();
      setReadyState();
    };

    docViewer.src = "about:blank";

    requestAnimationFrame(function () {
      if (currentToken !== loadToken) return;
      docViewer.src = cleanUrl;
    });

    loadTimeoutId = setTimeout(function () {
      if (currentToken !== loadToken) return;
      setErrorState();
    }, 15000);
  };

  window.cerrarDoc = function cerrarDoc() {
    loadToken += 1;
    clearPendingLoad();
    docViewer.onload = null;
    docViewer.src = "about:blank";
    modal.classList.remove("active", "ready", "has-error");
    pdfContainer.classList.remove("loading");
    unlockBodyScroll();
  };

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && modal.classList.contains("active")) {
      window.cerrarDoc();
    }
  });

  modal.addEventListener("click", function (event) {
    if (event.target === modal) {
      window.cerrarDoc();
    }
  });

  document.addEventListener("DOMContentLoaded", function () {
    if (sortSelect) {
      sortSelect.addEventListener("change", renderSongs);
    }

    renderSongs();
  });
})();
