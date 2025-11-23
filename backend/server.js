
const fs = require('fs').promises;
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const app = express();
const pool = require('./db.js');


function conectarConDB(reintentos = 10, espera = 5000) {
  const db = mysql.createConnection({
    // Lee las variables definidas en el db.js
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log(`ℹ️ Funcion conectarConDB`);

  // Intentamos conectar con el contendor de la BBDD, bucle hasta que levante.
  db.connect(err => {
    if (err) {
      console.error('❌ Error al conectar a MySQL:', err.message);
      if (reintentos > 0) {
        console.log(`🔁 Reintentando en ${espera / 1000}s... (${reintentos} restantes)`);
        setTimeout(() => conectarConDB(reintentos - 1, espera), espera);
      } else {
        console.error('🚫 No se pudo conectar a MySQL después de varios intentos. Abortando.');
        process.exit(1);
      }
    } else {
      console.log('✅ Conectado a MySQL');
      iniciar(db);
    }
  });
};

function iniciar(db) {
  // Lanzamos un proceso async para crear la extructura y el contendido de la base de datos
  console.log(`ℹ️ Funcion iniciar `);
  cargaBD(db);
};

async function cargaBD(db) {

  console.log(`ℹ️ funcion cargaBD `);
  var dbName = process.env.DB_NAME;
  const conn = await pool.getConnection();
  // cambia a la base de datos

  await conn.query(`USE \`${dbName}\``); // selecciona la base de datos

  try {

    // Carga la extructura de la base de datos
    var sqlFilePath = './sql_web_inmobiliaria.sql';
    var statements = '';
    await cargarSQL(sqlFilePath, statements, conn);

    // Carga el contenido de la base de datos
    var sqlFilePath = './sql_web_inmobiliaria_datos.sql';
    var statements = '';
    await cargarSQL(sqlFilePath, statements, conn);

    dbName = dbName.trim().replace(/^'|'$/g, "");

    var [rows_tbl] = await conn.query('SELECT count(1) total FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?', [dbName]);
    var total_tbl = rows_tbl.length > 0 ? rows_tbl[0].total : 0;

    var [rows_inmuebles] = await conn.query('SELECT count(1) total FROM ??.TblInmuebles', [dbName]);
    var total_inmuebles = rows_inmuebles.length > 0 ? rows_inmuebles[0].total : 0;

    if (total_tbl > 0) {
      console.log(`✅ La base de datos "${dbName}" existe y tiene "${total_tbl}" tablas. `);
      console.log(`✅ Existen un total de :"${total_inmuebles}" Inmuebles cargados.. `);

      levantaApi(db);

    } else {
      console.log(`❌ La base de datos "${dbName}" no existes. `);
    }

  } catch (err) {
    console.error('Error verificando la base de datos:', err);
  } finally {
    conn.release();
  };
};

async function cargarSQL(sqlFilePath, statements, conn) {
  console.log(`ℹ️ Funcion cargaSQL `);
  const sql = await fs.readFile(sqlFilePath, 'utf8');
  console.log(`📄 Carga de SQL: ${sqlFilePath} ...`);

  // Nota: si el archivo contiene múltiples sentencias separadas por ';'
  // se deben ejecutar una a una
  statements = sql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

  for (const stmt of statements) {
    await conn.query(stmt);
  }
  console.log(`📄 Carga de SQL: ${sqlFilePath} ... Completado`);
  return { sqlFilePath, statements };
};


function levantaApi(db) {
  // Levantamos el servidor de APIs
  console.log(`ℹ️ Funcion levantaApi `);
  app.use(cors());
  app.use(express.json());
  app.use(express.static('public'));
  console.log('Iniciando servidor de APIs...');


  // Rutas API
  app.get('/api/inmuebles', (req, res) => {
    // Listado completo de inmuebles (ABM interno)
    db.query('SELECT * FROM TblInmuebles', (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    });
  });

  app.get('/api/inmuebles/:id', (req, res) => {
    db.query('SELECT * FROM TblInmuebles WHERE IdInmueble=?', [req.params.id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results[0] || null);
    });
  });

  app.post('/api/inmuebles', (req, res) => {
    // Campos según la estructura de TblInmuebles
    const { Precio, Ambientes, Banos, Garage, Balcon, Metros_cuadrados, Fotodir, Titulo, Resumen, Descripcion } = req.body || {};
    db.query(
      'INSERT INTO TblInmuebles (Precio, Ambientes, Banos, Garage, Balcon, Metros_cuadrados, Fotodir, Titulo, Resumen, Descripcion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [Precio, Ambientes, Banos, Garage, Balcon, Metros_cuadrados, Fotodir, Titulo, Resumen, Descripcion],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ IdInmueble: result.insertId });
      }
    );
  });

  app.put('/api/inmuebles/:id', (req, res) => {
    const { Precio, Ambientes, Banos, Garage, Balcon, Metros_cuadrados, Fotodir, Titulo, Resumen, Descripcion } = req.body || {};
    db.query(
      'UPDATE TblInmuebles SET Precio=?, Ambientes=?, Banos=?, Garage=?, Balcon=?, Metros_cuadrados=?, Fotodir=?, Titulo=?, Resumen=?, Descripcion=? WHERE IdInmueble=?',
      [Precio, Ambientes, Banos, Garage, Balcon, Metros_cuadrados, Fotodir, Titulo, Resumen, Descripcion, req.params.id],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updated: result.affectedRows });
      }
    );
  });

  app.delete('/api/inmuebles/:id', (req, res) => {
    db.query('DELETE FROM TblInmuebles WHERE IdInmueble=?', [req.params.id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ deleted: result.affectedRows });
    });
  });
  app.get('/api/direcciones', (req, res) => {
    db.query('SELECT * FROM TblDirecciones', (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    });
  });

  app.get('/api/direcciones/:id', (req, res) => {
    db.query('SELECT * FROM TblDirecciones WHERE IdDireccion=?', [req.params.id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results[0] || null);
    });
  });
  app.post('/api/direcciones', (req, res) => {
    const { IdDireccion, IdInmueble, IdCalle, Numero, Piso, Puerta, IdCodigoPostal } = req.body || {};
    const doInsert = (id) => {
      db.query(
        'INSERT INTO TblDirecciones (IdDireccion, IdInmueble, IdCalle, Numero, Piso, Puerta, IdCodigoPostal) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, IdInmueble, IdCalle, Numero, Piso, Puerta, IdCodigoPostal],
        (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          res.status(201).json({ IdDireccion: id });
        }
      );
    };
    if (IdDireccion) return doInsert(IdDireccion);
    getNextId(db, 'TblDirecciones', 'IdDireccion', (err, next) => {
      if (err) return res.status(500).json({ error: err.message });
      doInsert(next);
    });
  });

  app.put('/api/direcciones/:id', (req, res) => {
    const { IdInmueble, IdCalle, Numero, Piso, Puerta, IdCodigoPostal } = req.body || {};
    db.query(
      'UPDATE TblDirecciones SET IdInmueble=?, IdCalle=?, Numero=?, Piso=?, Puerta=?, IdCodigoPostal=? WHERE IdDireccion=?',
      [IdInmueble, IdCalle, Numero, Piso, Puerta, IdCodigoPostal, req.params.id],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updated: result.affectedRows });
      }
    );
  });

  app.delete('/api/direcciones/:id', (req, res) => {
    db.query('DELETE FROM TblDirecciones WHERE IdDireccion=?', [req.params.id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ deleted: result.affectedRows });
    });
  });

  app.get('/api/anuncios', (req, res) => {
    /*
      Recupera todas los inmuebles para presentar en anuncios.
     TODO: 
      .Ejecutar un post para insertar la busqueda en la BBDD
    */
    db.query('select numero_inm, foto_inm, titulo_inm, Precio, ambientes, partido_barrio,  banios, garage, resumen_inm, descripcion_inm from v_inmuebles', (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    });

  });
  app.get('/api/anuncio/:id', (req, res) => {
    // Recuperar un unico para anuncio
    db.query('select numero_inm, foto_inm, titulo_inm, Precio, ambientes, banios, garage, resumen_inm, descripcion_inm from v_inmuebles WHERE numero_inm=?', [req.params.id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(result);
    });
  });

  // Helper: obtener próximo id (si la tabla no usa AUTO_INCREMENT)
  function getNextId(dbConn, table, idCol, cb) {
    const sql = `SELECT COALESCE(MAX(${idCol}),0)+1 AS next FROM ${table}`;
    dbConn.query(sql, (err, rows) => {
      if (err) return cb(err);
      const next = rows && rows.length > 0 ? rows[0].next : 1;
      cb(null, next);
    });
  }

  /* Rutas ABM para TblProvincia */
  app.get('/api/provincias', (req, res) => {
    db.query('SELECT * FROM TblProvincia', (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    });
  });

  app.get('/api/provincias/:id', (req, res) => {
    db.query('SELECT * FROM TblProvincia WHERE IdProvincia=?', [req.params.id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results[0] || null);
    });
  });

  app.post('/api/provincias', (req, res) => {
    const { IdProvincia, Descripcion } = req.body || {};
    const doInsert = (id) => {
      db.query('INSERT INTO TblProvincia (IdProvincia, Descripcion) VALUES (?, ?)', [id, Descripcion], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ IdProvincia: id });
      });
    };
    if (IdProvincia) return doInsert(IdProvincia);
    getNextId(db, 'TblProvincia', 'IdProvincia', (err, next) => {
      if (err) return res.status(500).json({ error: err.message });
      doInsert(next);
    });
  });

  app.put('/api/provincias/:id', (req, res) => {
    const { Descripcion } = req.body || {};
    db.query('UPDATE TblProvincia SET Descripcion=? WHERE IdProvincia=?', [Descripcion, req.params.id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: result.affectedRows });
    });
  });

  app.delete('/api/provincias/:id', (req, res) => {
    db.query('DELETE FROM TblProvincia WHERE IdProvincia=?', [req.params.id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ deleted: result.affectedRows });
    });
  });

  /* Rutas ABM para TblPartido */
  app.get('/api/partidos', (req, res) => {
    // Devolver la lista de partidos incluyendo la descripcion de la provincia
    const sql = `SELECT p.*, prov.Descripcion AS Provincia FROM TblPartido p LEFT JOIN TblProvincia prov ON p.idProvincia = prov.IdProvincia`;
    db.query(sql, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    });
  });

  app.get('/api/partidos/:id', (req, res) => {
    // Recupera un partido incluyendo la descripcion de la provincia
    const sql = `SELECT p.*, prov.Descripcion AS Provincia FROM TblPartido p LEFT JOIN TblProvincia prov ON p.idProvincia = prov.IdProvincia WHERE p.IdPartido = ?`;
    db.query(sql, [req.params.id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results[0] || null);
    });
  });

  app.post('/api/partidos', (req, res) => {
    const { IdPartido, Descripcion, idProvincia } = req.body || {};
    const doInsert = (id) => {
      db.query('INSERT INTO TblPartido (IdPartido, Descripcion, idProvincia) VALUES (?, ?, ?)', [id, Descripcion, idProvincia], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ IdPartido: id });
      });
    };
    if (IdPartido) return doInsert(IdPartido);
    getNextId(db, 'TblPartido', 'IdPartido', (err, next) => {
      if (err) return res.status(500).json({ error: err.message });
      doInsert(next);
    });
  });

  app.put('/api/partidos/:id', (req, res) => {
    const { Descripcion, idProvincia } = req.body || {};
    db.query('UPDATE TblPartido SET Descripcion=?, idProvincia=? WHERE IdPartido=?', [Descripcion, idProvincia, req.params.id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: result.affectedRows });
    });
  });

  app.delete('/api/partidos/:id', (req, res) => {
    db.query('DELETE FROM TblPartido WHERE IdPartido=?', [req.params.id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ deleted: result.affectedRows });
    });
  });

  /* Rutas ABM para TblCodigoPostal */
  app.get('/api/codigos-postales', (req, res) => {
    db.query('SELECT * FROM TblCodigoPostal', (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    });
  });

  app.get('/api/codigos-postales/:id', (req, res) => {
    db.query('SELECT * FROM TblCodigoPostal WHERE IdCodigoPostal=?', [req.params.id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results[0] || null);
    });
  });

  app.post('/api/codigos-postales', (req, res) => {
    const { IdCodigoPostal, Descripcion, IdPartido } = req.body || {};
    const doInsert = (id) => {
      db.query('INSERT INTO TblCodigoPostal (IdCodigoPostal, Descripcion, IdPartido) VALUES (?, ?, ?)', [id, Descripcion, IdPartido], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ IdCodigoPostal: id });
      });
    };
    if (IdCodigoPostal) return doInsert(IdCodigoPostal);
    getNextId(db, 'TblCodigoPostal', 'IdCodigoPostal', (err, next) => {
      if (err) return res.status(500).json({ error: err.message });
      doInsert(next);
    });
  });

  app.put('/api/codigos-postales/:id', (req, res) => {
    const { Descripcion, IdPartido } = req.body || {};
    db.query('UPDATE TblCodigoPostal SET Descripcion=?, IdPartido=? WHERE IdCodigoPostal=?', [Descripcion, IdPartido, req.params.id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: result.affectedRows });
    });
  });

  app.delete('/api/codigos-postales/:id', (req, res) => {
    db.query('DELETE FROM TblCodigoPostal WHERE IdCodigoPostal=?', [req.params.id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ deleted: result.affectedRows });
    });
  });

  /* Rutas ABM para TblCalles */
  app.get('/api/calles', (req, res) => {
    db.query('SELECT * FROM TblCalles', (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    });
  });

  app.get('/api/calles/:id', (req, res) => {
    db.query('SELECT * FROM TblCalles WHERE IdCalle=?', [req.params.id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results[0] || null);
    });
  });

  app.post('/api/calles', (req, res) => {
    const { IdCalle, Descripcion, IdCodigoPostal } = req.body || {};
    const doInsert = (id) => {
      db.query('INSERT INTO TblCalles (IdCalle, Descripcion, IdCodigoPostal) VALUES (?, ?, ?)', [id, Descripcion, IdCodigoPostal], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ IdCalle: id });
      });
    };
    if (IdCalle) return doInsert(IdCalle);
    getNextId(db, 'TblCalles', 'IdCalle', (err, next) => {
      if (err) return res.status(500).json({ error: err.message });
      doInsert(next);
    });
  });

  app.put('/api/calles/:id', (req, res) => {
    const { Descripcion, IdCodigoPostal } = req.body || {};
    db.query('UPDATE TblCalles SET Descripcion=?, IdCodigoPostal=? WHERE IdCalle=?', [Descripcion, IdCodigoPostal, req.params.id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: result.affectedRows });
    });
  });

  app.delete('/api/calles/:id', (req, res) => {
    db.query('DELETE FROM TblCalles WHERE IdCalle=?', [req.params.id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ deleted: result.affectedRows });
    });
  });

  /*
  app.post('/api/inmuebles', (req, res) => {
    res.json({ res:'Api no operativa'});
    
    //TODO:
      //.Cambiar el endpoint a api/busquedas
      //.cambiar el insert para insertar en la tabla de busquedas
    
    const { nombre, apellido, direccion, email } = req.body;
    db.query('INSERT INTO inmuebles (Precio, Ambientes, Banos, Garage, Balcon, Metros_cuadrados, Fotodir, Titulo, Resumen, Descripcion) VALUES (?, ?, ?, ?)',
      [nombre, apellido, direccion, email],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: result.insertId });
      });
    
  });

  app.put('/api/clientes/:id', (req, res) => {
    res.json({ res:'Api no operativa'});
    
    //TODO:
    //  .Eliminar la API de actualizacion, no es necesaria
    
    const { nombre, apellido, direccion, email } = req.body;
    db.query('UPDATE clientes SET nombre=?, apellido=?, direccion=?, email=? WHERE id=?',
      [nombre, apellido, direccion, email, req.params.id],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updated: result.affectedRows });
      });
    
  });

  app.delete('/api/clientes/:id', (req, res) => {
    res.json({ res:'Api no operativa'});
    
    //  .Eliminar la API de Borrado, no es necesaria
    
    db.query('DELETE FROM clientes WHERE id=?', [req.params.id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ deleted: result.affectedRows });
    });
    
  });

  // Ruta para obtener estructura
  app.get('/api/estructura', (req, res) => {
    res.json({ res:'Api no operativa'});
    
    const fs = require('fs');
    fs.readFile('./structure.json', 'utf8', (err, data) => {
      if (err) return res.status(500).json({ error: err.message });
        res.json(JSON.parse(data));
    });
    
  });

  // Ruta para actualizar estructura
  app.post('/api/estructura', (req, res) => {
    res.json({ res:'Api no operativa'});
    
    const fs = require('fs');
    const estructura = JSON.stringify(req.body, null, 2);
    fs.writeFile('./structure.json', estructura, err => {
      if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
    
  });
  */

  app.listen(3000, () => console.log('✅ API escuchando en estereo (Muy Soda) en  http://localhost:3000'));


};

conectarConDB(); // Inicia el proceso