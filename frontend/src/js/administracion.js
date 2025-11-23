(function(){
    // Config
    const API_BASE = 'http://localhost:8080/api'; // usa los endpoints de requests.http

    // Helper genérico para llamadas API
    async function api(path, method = 'GET', body){
      const opts = { method, headers: {} };
      if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
      const res = await fetch(API_BASE + path, opts);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status} ${res.statusText} - ${text}`);
      }
      // algunos endpoints devuelven sin body
      const contentType = res.headers.get('content-type') || '';
      return contentType.includes('application/json') ? res.json() : null;
    }

    // Render helpers
    function el(tag, attrs = {}, ...children){
      const e = document.createElement(tag);
      Object.entries(attrs).forEach(([k,v])=>{ if (k==='class') e.className = v; else if (k.startsWith('data-')) e.setAttribute(k,v); else e[k]=v; });
      children.flat().forEach(c=>{ if (c==null) return; e.append(typeof c === 'string' ? document.createTextNode(c) : c); });
      return e;
    }

    // --- Provincias ---
    async function loadProvincias(){
      const container = document.getElementById('view-provincias');
      container.innerHTML = '';
      const list = await api('/provincias');
      const table = el('table', {class:'abm-table'},
        el('thead', {}, el('tr', {}, el('th',{},'Id'), el('th',{},'Descripcion'), el('th',{},'Acciones'))),
        el('tbody', {}, ...list.map(p => el('tr', {},
          el('td',{}, p.IdProvincia),
          el('td',{}, p.Descripcion || ''),
          el('td',{},
            el('button',{onclick:()=>fillProvinciaForm(p)},'Editar'), ' ',
            el('button',{onclick:()=>deleteProvincia(p.IdProvincia)},'Borrar')
          )
        )))
      );

      const form = el('form', {id:'form-provincia', onsubmit: async e=>{ e.preventDefault(); await submitProvinciaForm(); }},
        el('h3',{},'Crear / Editar Provincia'),
        el('input',{type:'hidden', id:'prov-id'}),
        el('div',{class:'formulario'}, el('label',{},'Descripcion: '), el('input',{type:'text', id:'prov-desc', required:true})),
        el('div',{class:'formulario'}, el('button',{type:'submit'},'Guardar'), ' ', el('button',{type:'button', onclick:()=>resetProvinciaForm()},'Nuevo'))
      );

      container.append(el('h2',{},'Provincias'), table, form);
    }

    function fillProvinciaForm(p){
      document.getElementById('prov-id').value = p.IdProvincia;
      document.getElementById('prov-desc').value = p.Descripcion || '';
    }

    function resetProvinciaForm(){ document.getElementById('prov-id').value=''; document.getElementById('prov-desc').value=''; }

    async function submitProvinciaForm(){
      const id = document.getElementById('prov-id').value;
      const desc = document.getElementById('prov-desc').value;
      try{
        if (id) {
          await api(`/provincias/${id}`, 'PUT', { Descripcion: desc });
        } else {
          await api('/provincias', 'POST', { Descripcion: desc });
        }
        await loadProvincias(); resetProvinciaForm();
      }catch(err){ alert('Error: '+err.message); }
    }

    async function deleteProvincia(id){ if(!confirm('Borrar provincia '+id+'?')) return; try{ await api(`/provincias/${id}`,'DELETE'); await loadProvincias(); }catch(e){ alert('Error: '+e.message); } }

    // --- Partidos ---
    async function loadPartidos(){
      const container = document.getElementById('view-partidos'); container.innerHTML='';
      // obtener partidos y provincias
      const list = await api('/partidos');
      const provincias = await api('/provincias');

      const table = el('table', {class:'abm-table'},
        el('thead',{}, el('tr',{}, el('th',{},'Id'), el('th',{},'Descripcion'), el('th',{},'Provincia'), el('th',{},'Acciones'))),
        el('tbody',{}, ...list.map(p=> el('tr',{},
          el('td',{},p.IdPartido),
          el('td',{},p.Descripcion||''),
          el('td',{}, p.Provincia || p.idProvincia || ''),
          el('td',{}, el('button',{onclick:()=>fillPartidoForm(p)},'Editar'),' ', el('button',{onclick:()=>deletePartido(p.IdPartido)},'Borrar'))
        )))
      );

      const selectProv = el('select', {id:'part-prov', required:true},
        ...provincias.map(pr => el('option',{value: pr.IdProvincia}, pr.Descripcion || ''))
      );

      const form = el('form',{id:'form-partido', onsubmit: async e=>{ e.preventDefault(); await submitPartidoForm(); }},
        el('h3',{},'Crear / Editar Partido'),
        el('input',{type:'hidden', id:'part-id'}),
        el('div',{class:'formulario'}, el('label',{},'Descripcion: '), el('input',{type:'text', id:'part-desc', required:true})),
        el('div',{class:'formulario'}, el('label',{},'Provincia: '), selectProv),
        el('div',{class:'formulario'}, el('button',{type:'submit'},'Guardar'),' ', el('button',{type:'button', onclick:()=>resetPartidoForm()},'Nuevo'))
      );

      container.append(el('h2',{},'Partidos'), table, form);
    }

    function fillPartidoForm(p){ document.getElementById('part-id').value=p.IdPartido; document.getElementById('part-desc').value=p.Descripcion||''; document.getElementById('part-prov').value=p.idProvincia||''; }
    function resetPartidoForm(){ document.getElementById('part-id').value=''; document.getElementById('part-desc').value=''; document.getElementById('part-prov').value=''; }
    async function submitPartidoForm(){ const id=document.getElementById('part-id').value; const desc=document.getElementById('part-desc').value; const idProv=Number(document.getElementById('part-prov').value); try{ if(id) await api(`/partidos/${id}`,'PUT',{ Descripcion: desc, idProvincia: idProv }); else await api('/partidos','POST',{ Descripcion: desc, idProvincia: idProv }); await loadPartidos(); resetPartidoForm(); }catch(e){ alert('Error: '+e.message); } }
    async function deletePartido(id){ if(!confirm('Borrar partido '+id+'?')) return; try{ await api(`/partidos/${id}`,'DELETE'); await loadPartidos(); }catch(e){ alert('Error: '+e.message); } }

    // --- Codigos Postales ---
    async function loadCodigos(){
      const container = document.getElementById('view-codigos');
      container.innerHTML = '';
      // obtener codigos y partidos para mostrar la descripcion del partido
      const [list, partidos] = await Promise.all([ api('/codigos-postales'), api('/partidos') ]);
      const partMap = Object.fromEntries((partidos||[]).map(p => [p.IdPartido, p.Descripcion || '']));

      const table = el('table', {class:'abm-table'},
        el('thead', {}, el('tr', {}, el('th',{},'Id'), el('th',{},'Descripcion'), el('th',{},'Partido'), el('th',{},'Acciones'))),
        el('tbody', {}, ...list.map(c => el('tr', {},
          el('td', {}, c.IdCodigoPostal),
          el('td', {}, c.Descripcion || ''),
          el('td', {}, partMap[c.IdPartido] || (c.IdPartido || '')),
          el('td', {}, el('button',{onclick:()=>fillCodigoForm(c)},'Editar'), ' ', el('button',{onclick:()=>deleteCodigo(c.IdCodigoPostal)},'Borrar'))
        )))
      );

      const selectPart = el('select', {id:'cod-part', required:true},
        el('option',{value:''}, '-- Seleccione --'),
        ...(partidos||[]).map(p => el('option', {value: p.IdPartido}, p.Descripcion || ''))
      );

      const form = el('form', {id:'form-codigo', onsubmit: async e=>{ e.preventDefault(); await submitCodigoForm(); }},
        el('h3',{},'Crear / Editar Codigo Postal'),
        el('input',{type:'hidden', id:'cod-id'}),
        el('div',{class:'formulario'}, el('label',{},'Descripcion: '), el('input',{type:'text', id:'cod-desc', required:true})),
        el('div',{class:'formulario'}, el('label',{},'Partido: '), selectPart),
        el('div',{class:'formulario'}, el('button',{type:'submit'},'Guardar'),' ', el('button',{type:'button', onclick:()=>resetCodigoForm()},'Nuevo'))
      );

      container.append(el('h2',{},'Codigos Postales'), table, form);
    }

    function fillCodigoForm(c){
      document.getElementById('cod-id').value = c.IdCodigoPostal;
      document.getElementById('cod-desc').value = c.Descripcion || '';
      const sel = document.getElementById('cod-part'); if (sel) sel.value = c.IdPartido || '';
    }

    function resetCodigoForm(){
      document.getElementById('cod-id').value='';
      document.getElementById('cod-desc').value='';
      const sel = document.getElementById('cod-part'); if (sel) sel.value = '';
    }
    async function submitCodigoForm(){ const id=document.getElementById('cod-id').value; const desc=document.getElementById('cod-desc').value; const idPart=Number(document.getElementById('cod-part').value); try{ if(id) await api(`/codigos-postales/${id}`,'PUT',{ Descripcion: desc, IdPartido: idPart }); else await api('/codigos-postales','POST',{ Descripcion: desc, IdPartido: idPart }); await loadCodigos(); resetCodigoForm(); }catch(e){ alert('Error: '+e.message); } }
    async function deleteCodigo(id){ if(!confirm('Borrar codigo postal '+id+'?')) return; try{ await api(`/codigos-postales/${id}`,'DELETE'); await loadCodigos(); }catch(e){ alert('Error: '+e.message); } }

    // --- Calles ---
    async function loadCalles(){
      const container = document.getElementById('view-calles');
      container.innerHTML = '';
      // obtener calles y codigos postales para mostrar descripcion
      const list = await api('/calles');
      const codigos = await api('/codigos-postales');
      const codMap = Object.fromEntries((codigos||[]).map(cp => [cp.IdCodigoPostal, cp.Descripcion || '']));

      const table = el('table', {class:'abm-table'},
        el('thead', {}, el('tr', {}, el('th',{},'Id'), el('th',{},'Descripcion'), el('th',{},'Codigo Postal'), el('th',{},'Acciones'))),
        el('tbody', {}, ...list.map(c => el('tr', {},
          el('td', {}, c.IdCalle),
          el('td', {}, c.Descripcion || ''),
          el('td', {}, codMap[c.IdCodigoPostal] || ''),
          el('td', {}, el('button',{onclick:()=>fillCalleForm(c)},'Editar'), ' ', el('button',{onclick:()=>deleteCalle(c.IdCalle)},'Borrar'))
        )))
      );

      const selectCod = el('select', {id:'calle-cod', required:true},
        el('option', {value: ''}, '-- Seleccione --'),
        ...(codigos||[]).map(cp => el('option', {value: cp.IdCodigoPostal}, cp.Descripcion || ''))
      );

      const form = el('form', {id:'form-calle', onsubmit: async e=>{ e.preventDefault(); await submitCalleForm(); }},
        el('h3', {}, 'Crear / Editar Calle'),
        el('input', {type:'hidden', id:'calle-id'}),
        el('div', {class:'formulario'}, el('label', {}, 'Descripcion: '), el('input', {type:'text', id:'calle-desc', required:true})),
        el('div', {class:'formulario'}, el('label', {}, 'Codigo Postal: '), selectCod),
        el('div', {class:'formulario'}, el('button', {type:'submit'}, 'Guardar'), ' ', el('button', {type:'button', onclick:()=>resetCalleForm()}, 'Nuevo'))
      );

      container.append(el('h2',{},'Calles'), table, form);
    }

    function fillCalleForm(c){
      document.getElementById('calle-id').value = c.IdCalle;
      document.getElementById('calle-desc').value = c.Descripcion || '';
      const sel = document.getElementById('calle-cod'); if (sel) sel.value = c.IdCodigoPostal || '';
    }

    function resetCalleForm(){ document.getElementById('calle-id').value=''; document.getElementById('calle-desc').value=''; const sel=document.getElementById('calle-cod'); if(sel) sel.value=''; }

    async function submitCalleForm(){
      const id = document.getElementById('calle-id').value;
      const desc = document.getElementById('calle-desc').value;
      const idCod = Number(document.getElementById('calle-cod').value) || null;
      try{
        if (id) await api(`/calles/${id}`, 'PUT', { Descripcion: desc, IdCodigoPostal: idCod });
        else await api('/calles','POST',{ Descripcion: desc, IdCodigoPostal: idCod });
        await loadCalles(); resetCalleForm();
      }catch(e){ alert('Error: '+e.message); }
    }
    async function deleteCalle(id){ if(!confirm('Borrar calle '+id+'?')) return; try{ await api(`/calles/${id}`,'DELETE'); await loadCalles(); }catch(e){ alert('Error: '+e.message); } }

    // --- Direcciones ---
    async function loadDirecciones(){
      const container=document.getElementById('view-direcciones');
      container.innerHTML='';
      try{
        // Obtener direcciones e información relacionada para mostrar descripciones
        const [list, inmuebles, calles, codigos] = await Promise.all([
          api('/direcciones'), api('/inmuebles'), api('/calles'), api('/codigos-postales')
        ]);

        const inmMap = Object.fromEntries((inmuebles||[]).map(i => [i.IdInmueble, `${i.Titulo || 'Sin título'} (${i.Precio != null ? i.Precio : ''})`]));
        const calleMap = Object.fromEntries((calles||[]).map(c => [c.IdCalle, c.Descripcion || '']));
        const codMap = Object.fromEntries((codigos||[]).map(c => [c.IdCodigoPostal, c.Descripcion || '']));

        const table = el('table',{class:'abm-table'},
          el('thead',{}, el('tr',{}, el('th',{},'IdDireccion'), el('th',{},'Inmueble'), el('th',{},'Calle'), el('th',{},'Numero'), el('th',{},'Piso'), el('th',{},'Puerta'), el('th',{},'Codigo postal'), el('th',{},'Acciones'))),
          el('tbody',{}, ...list.map(d=> el('tr',{},
            el('td',{}, d.IdDireccion),
            el('td',{}, inmMap[d.IdInmueble] || d.IdInmueble || ''),
            el('td',{}, calleMap[d.IdCalle] || d.IdCalle || ''),
            el('td',{}, d.Numero || ''),
            el('td',{}, d.Piso || ''),
            el('td',{}, d.Puerta || ''),
            el('td',{}, codMap[d.IdCodigoPostal] || d.IdCodigoPostal || ''),
            el('td',{}, el('button',{onclick:()=>fillDireccionForm(d)},'Editar'), ' ', el('button',{onclick:()=>deleteDireccion(d.IdDireccion)},'Borrar'))
          )))
        );

        // selects para el formulario
        const selectInm = el('select', {id:'dir-inmueble', required:true},
          el('option',{value:''}, '-- Seleccione --'),
          ...(inmuebles||[]).map(i => el('option',{value: i.IdInmueble}, `${i.Titulo || 'Sin título'} (${i.Precio != null ? i.Precio : ''})`))
        );

        const selectCalle = el('select', {id:'dir-calle', required:true},
          el('option',{value:''}, '-- Seleccione --'),
          ...(calles||[]).map(c => el('option',{value: c.IdCalle}, c.Descripcion || ''))
        );

        const selectCod = el('select', {id:'dir-cod', required:true},
          el('option',{value:''}, '-- Seleccione --'),
          ...(codigos||[]).map(cp => el('option',{value: cp.IdCodigoPostal}, cp.Descripcion || ''))
        );

        const form = el('form', {id:'form-direccion', onsubmit: async e=>{ e.preventDefault(); await submitDireccionForm(); }},
          el('h3',{},'Crear / Editar Direccion'),
          el('input',{type:'hidden', id:'dir-id'}),
          el('div',{class:'formulario'}, el('label',{},'Inmueble: '), selectInm),
          el('div',{class:'formulario'}, el('label',{},'Calle: '), selectCalle),
          el('div',{class:'formulario'}, el('label',{},'Numero: '), el('input',{type:'number', id:'dir-numero'})),
          el('div',{class:'formulario'}, el('label',{},'Piso: '), el('input',{type:'number', id:'dir-piso'})),
          el('div',{class:'formulario'}, el('label',{},'Puerta: '), el('input',{type:'number', id:'dir-puerta'})),
          el('div',{class:'formulario'}, el('label',{},'Codigo Postal: '), selectCod),
          el('div',{class:'formulario'}, el('button',{type:'submit'},'Guardar'), ' ', el('button',{type:'button', onclick:()=>resetDireccionForm()},'Nuevo'))
        );

        container.append(el('h2',{},'Direcciones'), table, form);
      }catch(e){ container.append(el('div',{}, 'No se pudo cargar direcciones: '+e.message)); }
    }

    function fillDireccionForm(d){
      document.getElementById('dir-id').value = d.IdDireccion;
      document.getElementById('dir-inmueble').value = d.IdInmueble || '';
      document.getElementById('dir-calle').value = d.IdCalle || '';
      document.getElementById('dir-numero').value = d.Numero || '';
      document.getElementById('dir-piso').value = d.Piso || '';
      document.getElementById('dir-puerta').value = d.Puerta || '';
      document.getElementById('dir-cod').value = d.IdCodigoPostal || '';
    }

    function resetDireccionForm(){
      document.getElementById('dir-id').value='';
      document.getElementById('dir-inmueble').value='';
      document.getElementById('dir-calle').value='';
      document.getElementById('dir-numero').value='';
      document.getElementById('dir-piso').value='';
      document.getElementById('dir-puerta').value='';
      document.getElementById('dir-cod').value='';
    }

    async function submitDireccionForm(){
      const id = document.getElementById('dir-id').value;
      const payload = {
        IdInmueble: Number(document.getElementById('dir-inmueble').value) || null,
        IdCalle: Number(document.getElementById('dir-calle').value) || null,
        Numero: document.getElementById('dir-numero').value ? Number(document.getElementById('dir-numero').value) : null,
        Piso: document.getElementById('dir-piso').value ? Number(document.getElementById('dir-piso').value) : null,
        Puerta: document.getElementById('dir-puerta').value ? Number(document.getElementById('dir-puerta').value) : null,
        IdCodigoPostal: Number(document.getElementById('dir-cod').value) || null
      };
      try{
        if (id) {
          await api(`/direcciones/${id}`, 'PUT', payload);
        } else {
          await api('/direcciones', 'POST', payload);
        }
        await loadDirecciones(); resetDireccionForm();
      }catch(e){ alert('Error: '+e.message); }
    }

    async function deleteDireccion(id){ if(!confirm('Borrar direccion '+id+'?')) return; try{ await api(`/direcciones/${id}`,'DELETE'); await loadDirecciones(); }catch(e){ alert('Error: '+e.message); } }

    // --- Inmuebles ---
    async function loadInmuebles(){
      const container = document.getElementById('view-inmuebles'); container.innerHTML = '';
      try{
        const list = await api('/inmuebles');
        const table = el('table',{class:'abm-table'},
          el('thead',{}, el('tr',{}, el('th',{},'Id'), el('th',{},'Precio'), el('th',{},'Ambientes'), el('th',{},'Banos'), el('th',{},'Garage'), el('th',{},'Balcon'), el('th',{},'Metros'), el('th',{},'Titulo'), el('th',{},'Acciones'))),
          el('tbody',{}, ...list.map(i=> el('tr',{},
            el('td',{}, i.IdInmueble),
            el('td',{}, i.Precio || ''),
            el('td',{}, i.Ambientes || ''),
            el('td',{}, i.Banos || ''),
            el('td',{}, i.Garage || ''),
            el('td',{}, i.Balcon || ''),
            el('td',{}, i.Metros_cuadrados || ''),
            el('td',{}, i.Titulo || ''),
            el('td',{}, el('button',{onclick:()=>fillInmuebleForm(i)},'Editar'), ' ', el('button',{onclick:()=>deleteInmueble(i.IdInmueble)},'Borrar'))
          )))
        );

        const form = el('form',{id:'form-inmueble', onsubmit: async e=>{ e.preventDefault(); await submitInmuebleForm(); }},
          el('h3',{},'Crear / Editar Inmueble'),
          el('input',{type:'hidden', id:'inm-id'}),
          el('div',{class:'formulario'}, el('label',{},'Precio: '), el('input',{type:'number', id:'inm-precio'})),
          el('div',{class:'formulario'}, el('label',{},'Ambientes: '), el('input',{type:'number', id:'inm-ambientes'})),
          el('div',{class:'formulario'}, el('label',{},'Banos: '), el('input',{type:'number', id:'inm-banos'})),
          el('div',{class:'formulario'}, el('label',{},'Garage: '), el('input',{type:'number', id:'inm-garage'})),
          el('div',{class:'formulario'}, el('label',{},'Balcon: '), el('input',{type:'number', id:'inm-balcon'})),
          el('div',{class:'formulario'}, el('label',{},'Metros cuadrados: '), el('input',{type:'number', id:'inm-metros'})),
          el('div',{class:'formulario'}, el('label',{},'Fotodir (ruta): '), el('input',{type:'text', id:'inm-foto'})),
          el('div',{class:'formulario'}, el('label',{},'Titulo: '), el('input',{type:'text', id:'inm-titulo'})),
          el('div',{class:'formulario'}, el('label',{},'Resumen: '), el('textarea',{id:'inm-resumen', rows:2, cols:40})),
          el('div',{class:'formulario'}, el('label',{},'Descripcion: '), el('textarea',{id:'inm-descripcion', rows:4, cols:40})),
          el('div',{class:'formulario'}, el('button',{type:'submit'},'Guardar'), ' ', el('button',{type:'button', onclick:()=>resetInmuebleForm()},'Nuevo'))
        );

        container.append(el('h2',{},'Inmuebles'), table, form);
      }catch(e){ container.append(el('div',{}, 'No se pudo cargar inmuebles: '+e.message)); }
    }

    function fillInmuebleForm(i){
      document.getElementById('inm-id').value = i.IdInmueble || '';
      document.getElementById('inm-precio').value = i.Precio || '';
      document.getElementById('inm-ambientes').value = i.Ambientes || '';
      document.getElementById('inm-banos').value = i.Banos || '';
      document.getElementById('inm-garage').value = i.Garage || '';
      document.getElementById('inm-balcon').value = i.Balcon || '';
      document.getElementById('inm-metros').value = i.Metros_cuadrados || '';
      document.getElementById('inm-foto').value = i.Fotodir || '';
      document.getElementById('inm-titulo').value = i.Titulo || '';
      document.getElementById('inm-resumen').value = i.Resumen || '';
      document.getElementById('inm-descripcion').value = i.Descripcion || '';
    }

    function resetInmuebleForm(){
      document.getElementById('inm-id').value='';
      document.getElementById('inm-precio').value='';
      document.getElementById('inm-ambientes').value='';
      document.getElementById('inm-banos').value='';
      document.getElementById('inm-garage').value='';
      document.getElementById('inm-balcon').value='';
      document.getElementById('inm-metros').value='';
      document.getElementById('inm-foto').value='';
      document.getElementById('inm-titulo').value='';
      document.getElementById('inm-resumen').value='';
      document.getElementById('inm-descripcion').value='';
    }

    async function submitInmuebleForm(){
      const id = document.getElementById('inm-id').value;
      const payload = {
        Precio: document.getElementById('inm-precio').value ? Number(document.getElementById('inm-precio').value) : null,
        Ambientes: document.getElementById('inm-ambientes').value ? Number(document.getElementById('inm-ambientes').value) : null,
        Banos: document.getElementById('inm-banos').value ? Number(document.getElementById('inm-banos').value) : null,
        Garage: document.getElementById('inm-garage').value ? Number(document.getElementById('inm-garage').value) : null,
        Balcon: document.getElementById('inm-balcon').value ? Number(document.getElementById('inm-balcon').value) : null,
        Metros_cuadrados: document.getElementById('inm-metros').value ? Number(document.getElementById('inm-metros').value) : null,
        Fotodir: document.getElementById('inm-foto').value || null,
        Titulo: document.getElementById('inm-titulo').value || null,
        Resumen: document.getElementById('inm-resumen').value || null,
        Descripcion: document.getElementById('inm-descripcion').value || null
      };
      try{
        if (id) {
          await api(`/inmuebles/${id}`, 'PUT', payload);
        } else {
          await api('/inmuebles', 'POST', payload);
        }
        await loadInmuebles(); resetInmuebleForm();
      }catch(e){ alert('Error: '+e.message); }
    }

    async function deleteInmueble(id){ if(!confirm('Borrar inmueble '+id+'?')) return; try{ await api(`/inmuebles/${id}`,'DELETE'); await loadInmuebles(); }catch(e){ alert('Error: '+e.message); } }

    // --- Navegación y carga inicial ---
    function showView(name){ document.querySelectorAll('.abm-view').forEach(v=>v.style.display='none'); document.getElementById('view-'+name).style.display='block';
      // cargar datos
      if(name==='provincias') loadProvincias();
      if(name==='partidos') loadPartidos();
      if(name==='calles') loadCalles();
      if(name==='codigos') loadCodigos();
      if(name==='direcciones') loadDirecciones();
      if(name==='inmuebles') loadInmuebles();
    }

    document.querySelectorAll('#pantallaprovincias nav button').forEach(b=> b.addEventListener('click', ()=> showView(b.getAttribute('data-view'))));

    // iniciar en provincias
    showView('provincias');

  })();