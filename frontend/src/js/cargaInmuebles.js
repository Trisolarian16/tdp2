
// 
const API_all = "http://localhost:8080/api/anuncios";


async function cargar() {
  try {

    const res = await fetch(API_all);

    if (!res.ok) throw new Error("Error al obtener datos del servidor");

    const datos = await res.json();
    const contenedor = document.querySelector(".contenedor-anuncios");
    contenedor.innerHTML = "";

    renderizar(datos, contenedor);



  } catch (err) {
    console.error("❌ Error cargando inmuebles:", err);
    alert("No se pudieron cargar los datos desde el servidorrrr.");
  }
}

function setPrecio() {
  bPrecio = document.getElementById("CampoPrecio").value;
  cargar();
};

function setBarrio() {
  bBarrio = document.getElementById("CampoBarrio").value;
  cargar();
};

function renderizar(datos, contenedor) {

  datos.forEach(d => {
    // Imagen por defecto si la API no trae una
    const card = document.createElement("div");
    card.classList.add("anuncio");

    mostrar = "Mostrando"

    if (parseInt(bPrecio) < parseInt(d.Precio)) {
      mostrar = "NoMostrar"

    }

    if (d.partido_barrio.toLowerCase().indexOf(bBarrio.toLowerCase()) === -1) {
      mostrar = "NoMostrar"
    }

    console.log(d.titulo_inm, parseInt(bPrecio), parseInt(d.Precio), mostrar)

    card.innerHTML = `
        <picture>
            <img loading="lazy" height="200"  src="${d.foto_inm}" alt="${d.foto_inm}">
        </picture>

        <div class="contenido-anuncio">
            <h3>${d.titulo_inm}</h3>
            <p style="height:100px">${d.resumen_inm}</p>
            <p class="precio">$${Number(d.Precio).toLocaleString()}</p>
            

            <ul class="iconos-caracteristicas">
                <li>
                    <img class="icono" loading="lazy" src="build/img/icono_wc.svg" alt="Baños">
                    <p>${d.banios ?? 0}</p>
                </li>
                <li>
                    <img class="icono" loading="lazy" src="build/img/icono_estacionamiento.svg" alt="Garage">
                    <p>${d.garage ?? 0}</p>
                </li>
                <li>
                    <img class="icono" loading="lazy" src="build/img/icono_dormitorio.svg" alt="Dormitorios">
                    <p>${d.ambientes ?? 0}</p>
                </li>
            </ul>

            <a href="anuncio.html?id=${d.numero_inm}" class="boton-amarillo-block">
                Ver Anuncio
            </a>
        </div>
      `;

    if (mostrar == 'Mostrando') {
      contenedor.appendChild(card);
    }

  });


};



var bPrecio = '';
var bBarrio = '';

cargar();
