document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("modal-producto");
  const modalTrack = document.getElementById("modal-galeria-track");
  const modalNombre = document.getElementById("modal-nombre");
  const modalDescripcion = document.getElementById("modal-descripcion");
  const modalPrecios = document.querySelector(".modal-precios");
  const modalWspBtn = document.getElementById("modal-whatsapp");
  const prevBtn = document.querySelector(".modal-galeria-btn.prev");
  const nextBtn = document.querySelector(".modal-galeria-btn.next");

  let imagenes = [];
  let indiceActual = 0;

  // 🟢 MODAL - Mostrar detalle del producto
  document.querySelectorAll(".producto-card").forEach(card => {
    card.addEventListener("click", () => {
      const galeria = card.querySelectorAll(".galeria-imagenes img, video");
      if (!galeria.length) return;

      imagenes = Array.from(galeria);
      indiceActual = 0;

      modalNombre.textContent = card.dataset.nombre || '';
      modalDescripcion.textContent = card.dataset.descripcion || '';
      modalPrecios.innerHTML = `
        <span class="precio-actual">$${formatear(card.dataset.precio)}</span>
        <span class="precio-anterior">$${formatear(card.dataset.precioAnterior)}</span>
      `;

      mostrarImagen(indiceActual);
      modal.style.display = "flex";
    });
  });

  // Mostrar imagen/video en modal
  function mostrarImagen(i) {
    const src = imagenes[i]?.src;
    if (!src) return;
    const ext = src.split(".").pop().toLowerCase();
    const isVideo = ["mp4", "webm", "ogg"].includes(ext);

    modalTrack.innerHTML = "";

    if (isVideo) {
      const video = document.createElement("video");
      video.src = src;
      video.controls = true;
      video.style.maxHeight = "300px";
      video.style.borderRadius = "10px";
      modalTrack.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = src;
      img.style.maxHeight = "300px";
      img.style.objectFit = "contain";
      img.style.borderRadius = "10px";
      modalTrack.appendChild(img);
    }

    actualizarWhatsApp(src);
    mostrarContador();
  }

  function formatear(valor) {
    return valor ? parseInt(valor).toLocaleString("es-CO") : "—";
  }

  function actualizarWhatsApp(imgUrl) {
    modalWspBtn.dataset.nombre = modalNombre.textContent;
    modalWspBtn.dataset.img = imgUrl;
  }

  function mostrarContador() {
    let contador = document.getElementById("modal-contador");
    if (!contador) {
      contador = document.createElement("div");
      contador.id = "modal-contador";
      contador.style.textAlign = "center";
      contador.style.marginTop = "10px";
      contador.style.color = "#888";
      contador.style.fontSize = "14px";
      modal.querySelector(".modal-galeria").appendChild(contador);
    }
    contador.textContent = `${indiceActual + 1} / ${imagenes.length}`;
  }

  prevBtn.addEventListener("click", () => {
    if (indiceActual > 0) {
      indiceActual--;
      mostrarImagen(indiceActual);
    }
  });

  nextBtn.addEventListener("click", () => {
    if (indiceActual < imagenes.length - 1) {
      indiceActual++;
      mostrarImagen(indiceActual);
    }
  });

  // Cerrar modal
  modal.querySelector(".modal-close").addEventListener("click", () => {
    modal.style.display = "none";
    modalTrack.innerHTML = "";
    document.getElementById("modal-contador")?.remove();
  });

  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") modal.style.display = "none";
  });

  // 🟡 WhatsApp desde botón
  document.querySelectorAll(".btn-wsp-producto").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const nombre = btn.dataset.nombre || "Producto";
      const img = btn.dataset.img || "";
      const mensaje = `Hola, me interesa este producto de DUO STYLE:\n🛍️ *${nombre}*\n📸 ${img}`;
      window.open(`https://wa.me/573209074830?text=${encodeURIComponent(mensaje)}`, "_blank");
    });
  });

  // 🔁 Carrusel (sección nuevas)
  document.querySelectorAll(".slider-container").forEach(container => {
    const track = container.querySelector(".slider-track");
    const prev = container.querySelector(".slider-btn.prev");
    const next = container.querySelector(".slider-btn.next");

    prev?.addEventListener("click", () => {
      track.scrollBy({ left: -300, behavior: "smooth" });
    });
    next?.addEventListener("click", () => {
      track.scrollBy({ left: 300, behavior: "smooth" });
    });
  });

  // 🟣 Paginador independiente por sección
const productosPorPagina = 9;

document.querySelectorAll(".grid-productos").forEach(grid => {
  const productos = Array.from(grid.querySelectorAll(".producto-card"));
  if (productos.length === 0) return;

  let paginador = document.createElement("div");
  paginador.className = "paginador";
  grid.after(paginador);

  const totalPaginas = Math.ceil(productos.length / productosPorPagina);
  let paginaActual = 1;

  function mostrarPagina(pagina) {
    productos.forEach((producto, index) => {
      const mostrar = index >= (pagina - 1) * productosPorPagina && index < pagina * productosPorPagina;
      producto.style.display = mostrar ? "flex" : "none";
    });

    // Regenerar botones
    paginador.innerHTML = "";
    for (let i = 1; i <= totalPaginas; i++) {
      const boton = document.createElement("button");
      boton.textContent = i;
      boton.className = "pagina-btn" + (i === pagina ? " activo" : "");
      boton.addEventListener("click", () => {
        mostrarPagina(i);

        // ⬆️ Hacer scroll al inicio de la sección (padre de grid)
        const seccion = grid.closest("section") || grid.parentElement;
        if (seccion) {
          seccion.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
      paginador.appendChild(boton);
    }

    paginaActual = pagina;
  }

  mostrarPagina(paginaActual);
});})
