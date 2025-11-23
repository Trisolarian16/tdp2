
async function obtenerIdDesdeURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function cargarAnuncio() {
    try {
        const contenedor = document.querySelector(".AnuncioCompleto");
        contenedor.innerHTML = "";

        const id = await obtenerIdDesdeURL();

        if (!id) {
            contenedor.innerHTML = "<p>No se ha encontrado un ID válido.</p>";
            return;
        }


        const API_1 = `http://localhost:3000/api/anuncio/${encodeURIComponent(id)}`;

        const res = await fetch(API_1);
        if (!res.ok) throw new Error("Error al obtener datos del servidor");

        const resultado = await res.json();


        const d = Array.isArray(resultado) ? resultado[0] : resultado;

        if (!d) {
            contenedor.innerHTML = "<p>El anuncio no existe.</p>";
            return;
        }

        // 
        const titulo = d.titulo_inm ?? d.titulo ?? "Sin título";
        const foto = d.foto_inm ?? d.foto ?? "";
        const precioRaw = d.Precio ?? d.precio ?? d.precio_inm ?? 0;
        const precio = Number(precioRaw) || 0;
        const banios = d.banios ?? d.wc ?? 0;
        const garage = d.garage ?? d.garajes ?? 0;
        const ambientes = d.ambientes ?? d.habitaciones ?? 0;
        const resumen = d.resumen_inm ?? d.resumen ?? "";
        const descripcion = d.descripcion_inm ?? d.descripcion ?? "";

        contenedor.innerHTML = `
            <h1>${titulo}</h1>

            <picture>
                <img loading="lazy" height="382.91" width="382.91" src="${foto}" alt="imagen de la propiedad">
            </picture>

            <div class="resumen-propiedad">
                <p class="precio">$${precio.toLocaleString()}</p>
                <ul class="iconos-caracteristicas">
                    <li>
                        <img class="icono" loading="lazy" src="build/img/icono_wc.svg" alt="icono wc">
                        <p>${banios}</p>
                    </li>
                    <li>
                        <img class="icono" loading="lazy" src="build/img/icono_estacionamiento.svg" alt="Garage">
                        <p>${garage}</p>
                    </li>
                    <li>
                        <img class="icono" loading="lazy" src="build/img/icono_dormitorio.svg" alt="icono habitaciones">
                        <p>${ambientes}</p>
                    </li>
                </ul>

                <p>${resumen}</p>

                <p>${descripcion}</p>
            </div>
        `;
    } catch (err) {
        console.error("❌ Error cargando inmueble:", err);
        document.querySelector(".AnuncioCompleto").innerHTML = "<p>No se pudo cargar el anuncio desde el servidor.</p>";
    }
}


document.addEventListener("DOMContentLoaded", cargarAnuncio);
