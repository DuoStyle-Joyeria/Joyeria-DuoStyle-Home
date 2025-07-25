document.addEventListener("DOMContentLoaded", function () {
  const modal = document.getElementById("modal-producto");
  const modalTrack = document.getElementById("modal-galeria-track");
  const modalNombre = document.getElementById("modal-nombre");
  const modalDescripcion = document.getElementById("modal-descripcion");
  const modalWspBtn = document.getElementById("modal-whatsapp");
  const modalPrecios = document.querySelector(".modal-precios");
  const prevBtn = document.querySelector(".modal-galeria-btn.prev");
  const nextBtn = document.querySelector(".modal-galeria-btn.next");

  let closeBtn;
  let imagenes = [];
  let indiceActual = 0;

  // WhatsApp
  document.querySelectorAll(".btn-wsp-producto").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const numero = "573156279342";
      const nombre = btn.dataset.nombre;
      const imagen = btn.dataset.img;
      const url = `${window.location.origin}/${imagen}`;
      const mensaje = `Hola, me interesa este producto de DUO STYLE:%0A🛍️ *${nombre}*%0A📸 Imagen: ${url}`;
      window.open(`https://wa.me/${numero}?text=${mensaje}`, "_blank");
    });
  });

  // Abrir modal
  document.querySelectorAll(".producto-card").forEach(card => {
    const boton = card.querySelector(".btn-wsp-producto");
    if (boton) boton.addEventListener("click", e => e.stopPropagation());

    card.addEventListener("click", () => {
      const nombre = card.dataset.nombre;
      const descripcion = card.dataset.descripcion;
      const precio = card.dataset.precio;
      const precioAnterior = card.dataset.precioAnterior;
      const galeria = card.querySelectorAll(".galeria-imagenes img, .galeria-imagenes video");

      if (!galeria.length) return;

      modalNombre.textContent = nombre;
      modalDescripcion.textContent = descripcion;
      imagenes = Array.from(galeria);
      indiceActual = 0;

      mostrarImagen(indiceActual);

      modalPrecios.innerHTML = `
        <div class="precio-modal">
          <span class="precio-actual">$${formatearPrecio(precio)}</span>
          <span class="precio-anterior">$${formatearPrecio(precioAnterior)}</span>
        </div>
      `;

      const visible = imagenes.length > 1;
      prevBtn.style.display = visible ? "block" : "none";
      nextBtn.style.display = visible ? "block" : "none";

      modal.style.display = "flex";

      closeBtn = document.querySelector(".modal-close");
      if (closeBtn) {
        closeBtn.removeEventListener("click", cerrarModal);
        closeBtn.addEventListener("click", cerrarModal);
      }
    });
  });

  function mostrarImagen(index) {
    if (!imagenes[index]) return;
    const src = imagenes[index].getAttribute("src");
    const ext = src.split(".").pop().toLowerCase();
    const esVideo = ["mp4", "webm", "ogg"].includes(ext);

    modalTrack.innerHTML = '<div style="text-align:center;padding:20px;color:#888;">Cargando...</div>';

    if (esVideo) {
      const video = document.createElement("video");
      video.src = src;
      video.controls = true;
      video.playsInline = true;
      video.style.maxHeight = "300px";
      video.style.margin = "auto";
      video.style.borderRadius = "10px";
      video.style.display = "none";

      video.onloadeddata = () => {
        modalTrack.innerHTML = '';
        modalTrack.appendChild(video);
        video.style.display = 'block';
        actualizarWhatsApp(src);
        mostrarContador();
      };

      video.onerror = () => {
        modalTrack.innerHTML = `<p style="color:red;text-align:center;">⚠️ Error cargando video.</p>`;
      };
    } else {
      const img = document.createElement("img");
      img.src = src;
      img.alt = `Imagen ${index + 1}`;
      img.style.maxHeight = "300px";
      img.style.margin = "auto";
      img.style.borderRadius = "10px";
      img.style.display = "none";
      img.style.objectFit = "contain";

      img.onload = () => {
        modalTrack.innerHTML = '';
        modalTrack.appendChild(img);
        img.style.display = "block";
        actualizarWhatsApp(src);
        mostrarContador();
      };

      img.onerror = () => {
        modalTrack.innerHTML = `<p style="color:red;text-align:center;">⚠️ Error cargando imagen.</p>`;
      };
    }
  }

  function actualizarWhatsApp(src) {
    const nombre = modalNombre.textContent;
    modalWspBtn.dataset.nombre = nombre;
    modalWspBtn.dataset.img = src;
  }

  function mostrarContador() {
    let contador = document.getElementById('modal-contador');
    if (!contador) {
      contador = document.createElement("div");
      contador.id = "modal-contador";
      contador.style.textAlign = "center";
      contador.style.marginTop = "10px";
      contador.style.fontSize = "14px";
      contador.style.color = "#888";
      modalTrack.parentElement.parentElement.insertBefore(contador, modalTrack.parentElement.nextSibling);
    }
    contador.textContent = `${indiceActual + 1} / ${imagenes.length}`;
  }

  function formatearPrecio(valor) {
    if (!valor) return '—';
    return parseInt(valor).toLocaleString('es-CO');
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

  function cerrarModal() {
    modal.style.display = "none";
    modalTrack.innerHTML = '';
    const contador = document.getElementById('modal-contador');
    if (contador) contador.remove();
    modalPrecios.innerHTML = '';
  }

  window.addEventListener("click", e => {
    if (e.target === modal) cerrarModal();
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && modal.style.display === "flex") cerrarModal();
  });

  // Swipe móvil
  let startX = 0;
  modalTrack.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
  });
  modalTrack.addEventListener("touchend", e => {
    const endX = e.changedTouches[0].clientX;
    const diff = startX - endX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && indiceActual < imagenes.length - 1) {
        indiceActual++;
        mostrarImagen(indiceActual);
      } else if (diff < 0 && indiceActual > 0) {
        indiceActual--;
        mostrarImagen(indiceActual);
      }
    }
  });

  // Carrusel
  document.querySelectorAll(".slider-container").forEach(container => {
    const track = container.querySelector(".slider-track");
    const btnPrev = container.querySelector(".slider-btn.prev");
    const btnNext = container.querySelector(".slider-btn.next");

    btnPrev.addEventListener("click", () => {
      track.scrollBy({ left: -300, behavior: 'smooth' });
    });

    btnNext.addEventListener("click", () => {
      track.scrollBy({ left: 300, behavior: 'smooth' });
    });
  });

  // Mostrar productos (inicio)
  document.querySelectorAll('.catalogo-section').forEach(seccion => {
    const productos = seccion.querySelectorAll('.producto-card');
    productos.forEach((card, i) => {
      card.style.display = i < 6 ? 'block' : 'none';
    });
  });

  // Ver más productos
  document.querySelectorAll('.btn-ver-mas').forEach(boton => {
    boton.addEventListener('click', () => {
      const seccionId = boton.dataset.seccion;
      const seccion = document.getElementById(seccionId);
      if (!seccion) return;

      const productos = seccion.querySelectorAll('.producto-card');
      const ocultos = Array.from(productos).filter(c => c.style.display === 'none');

      ocultos.slice(0, 3).forEach(c => c.style.display = 'block');

      if (ocultos.length <= 3) {
        boton.style.display = 'none';
      }
    });
  });
});
