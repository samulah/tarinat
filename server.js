const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const cookieParser = require('cookie-parser');
const sharp = require('sharp');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Debug middleware - näyttää kaikki pyynnöt
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tarinat';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB yhdistetty'))
  .catch(err => console.error('MongoDB yhteysvirhe:', err));

// Tietomalli tarinoille
const tarinaSchema = new mongoose.Schema({
  numero: { type: Number, unique: true },
  nimimerkki: { type: String, default: 'anonyymi' },
  kayttajaId: { type: String, required: true }, // Uniikki tunniste käyttäjälle
  kuva: { type: String, required: true },
  teksti: { type: String, required: true },
  pakinaAanet: { type: Number, default: 0 },
  tarinaAanet: { type: Number, default: 0 },
  luotu: { type: Date, default: Date.now }
});

// Tekstihaku-indeksi
tarinaSchema.index({
  teksti: 'text',
  nimimerkki: 'text'
});

// Tietomalli kommenteille
const kommenttiSchema = new mongoose.Schema({
  numero: { type: Number, unique: true },
  tarinaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tarina', required: true },
  nimimerkki: { type: String, default: 'anonyymi' },
  kayttajaId: { type: String, required: true }, // Uniikki tunniste käyttäjälle
  kuva: { type: String, required: true },
  teksti: { type: String, required: true },
  luotu: { type: Date, default: Date.now }
});

// Laskurit
const laskuriSchema = new mongoose.Schema({
  nimi: { type: String, unique: true },
  arvo: { type: Number, default: 0 }
});

// Tietomalli tageille
const tagiSchema = new mongoose.Schema({
  nimi: { type: String, required: true }, // esim. "hauska", "koira", "kissa"
  tarinaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tarina', required: true },
  luoja: { type: String, default: 'anonyymi' }, // kuka lisäsi tagin
  kayttajaId: { type: String, required: true }, // Uniikki tunniste käyttäjälle
  positiivisetAanet: { type: Number, default: 0 },
  negatiivisetAanet: { type: Number, default: 0 },
  luotu: { type: Date, default: Date.now }
});

// Indeksi tagien hakua varten
tagiSchema.index({ nimi: 1, tarinaId: 1 }, { unique: true }); // Estää saman tagin lisäämisen useita kertoja samaan tarinaan

const Tarina = mongoose.model('Tarina', tarinaSchema);
const Kommentti = mongoose.model('Kommentti', kommenttiSchema);
const Laskuri = mongoose.model('Laskuri', laskuriSchema);
const Tagi = mongoose.model('Tagi', tagiSchema);

// Multer kuvien tallennukselle
const storage = multer.memoryStorage(); // Käytetään muistia väliaikaisesti

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Vain kuvatiedostot sallittu!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});

// Kuvan optimointifunktio
async function optimoiKuva(buffer, filename) {
  const outputPath = path.join('uploads', filename);
  
  await sharp(buffer)
    .resize(800, 600, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({
      quality: 85,
      progressive: true
    })
    .toFile(outputPath);
    
  return outputPath;
}

// Apufunktio seuraavan numeron hakemiselle
async function seuraavaNumero(tyyppi) {
  const laskuri = await Laskuri.findOneAndUpdate(
    { nimi: tyyppi },
    { $inc: { arvo: 1 } },
    { new: true, upsert: true }
  );
  return laskuri.arvo;
}

// Käyttäjätunnisteen hallinta
function generoiKayttajaId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Middleware käyttäjätunnisteen tarkistukselle/luonnille
function varmistKayttajaTunniste(req, res, next) {
  let kayttajaId = req.cookies.kayttajaId;
  
  if (!kayttajaId) {
    kayttajaId = generoiKayttajaId();
    res.cookie('kayttajaId', kayttajaId, { 
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 vuosi
      httpOnly: true,
      sameSite: 'strict'
    });
  }
  
  req.kayttajaId = kayttajaId;
  next();
}

// Admin-autentikointi
const ADMIN_SALASANA = process.env.ADMIN_SALASANA || 'admin123';

function tarkistaAdmin(req, res, next) {
  const adminSession = req.cookies.adminSession;
  
  if (adminSession === 'admin-' + ADMIN_SALASANA) {
    req.onAdmin = true;
    next();
  } else {
    res.status(401).json({ error: 'Ei oikeuksia' });
  }
}

// Reitit

// Haku-endpoint
app.get('/api/haku', async (req, res) => {
  try {
    const { q, tagi } = req.query;
    let hakuEhdot = {};
    
    // Tekstihaku
    if (q && q.trim()) {
      hakuEhdot.$text = { $search: q.trim() };
    }
    
    // Tag-suodatus
    if (tagi) {
      const tagienTarinat = await Tagi.find({ 
        nimi: new RegExp(tagi, 'i') 
      }).distinct('tarinaId');
      
      if (hakuEhdot.$text) {
        hakuEhdot.$and = [
          { $text: { $search: q.trim() } },
          { _id: { $in: tagienTarinat } }
        ];
        delete hakuEhdot.$text;
      } else {
        hakuEhdot._id = { $in: tagienTarinat };
      }
    }
    
    const tarinat = await Tarina.find(hakuEhdot)
      .sort(hakuEhdot.$text ? { score: { $meta: 'textScore' } } : { luotu: -1 })
      .limit(50);
    
    res.json(tarinat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Hae kaikki tarinat
app.get('/api/tarinat', async (req, res) => {
  try {
    const tarinat = await Tarina.find().sort({ luotu: -1 });
    res.json(tarinat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Hae kaikki viestit (tarinat + kommentit) numerojärjestyksessä
app.get('/api/viestit', async (req, res) => {
  try {
    const tarinat = await Tarina.find().lean();
    const kommentit = await Kommentti.find().lean();
    
    // Lisää tyyppi-kenttä erottamaan tarinat ja kommentit
    const tarinatTyped = tarinat.map(t => ({ ...t, tyyppi: 'tarina' }));
    const kommentitTyped = kommentit.map(k => ({ ...k, tyyppi: 'kommentti' }));
    
    // Yhdistä ja järjestä numeron mukaan
    const kaikki = [...tarinatTyped, ...kommentitTyped].sort((a, b) => a.numero - b.numero);
    
    res.json(kaikki);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Hae yksittäinen tarina ID:n perusteella
app.get('/api/tarinat/:id', async (req, res) => {
  try {
    const tarina = await Tarina.findById(req.params.id);
    if (!tarina) {
      return res.status(404).json({ error: 'Tarinaa ei löytynyt' });
    }
    res.json(tarina);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Virheellinen tarinan ID' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Luo uusi tarina
app.post('/api/tarinat', varmistKayttajaTunniste, upload.single('kuva'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Kuva on pakollinen!' });
    }

    // Optimoi kuva
    const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.jpg';
    const kuvaPolku = await optimoiKuva(req.file.buffer, filename);

    const numero = await seuraavaNumero('yhteinen');
    const tarina = new Tarina({
      numero,
      nimimerkki: req.body.nimimerkki || 'anonyymi',
      kayttajaId: req.kayttajaId,
      kuva: '/uploads/' + filename,
      teksti: req.body.teksti
    });

    await tarina.save();
    res.status(201).json(tarina);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Hae tarinan kommentit
app.get('/api/tarinat/:id/kommentit', async (req, res) => {
  try {
    const kommentit = await Kommentti.find({ tarinaId: req.params.id }).sort({ luotu: 1 });
    res.json(kommentit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lisää kommentti tarinaan
app.post('/api/tarinat/:id/kommentit', varmistKayttajaTunniste, upload.single('kuva'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Kuva on pakollinen!' });
    }

    // Optimoi kuva
    const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.jpg';
    const kuvaPolku = await optimoiKuva(req.file.buffer, filename);

    const numero = await seuraavaNumero('yhteinen');
    const kommentti = new Kommentti({
      numero,
      tarinaId: req.params.id,
      nimimerkki: req.body.nimimerkki || 'anonyymi',
      kayttajaId: req.kayttajaId,
      kuva: '/uploads/' + filename,
      teksti: req.body.teksti
    });

    await kommentti.save();
    res.status(201).json(kommentti);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Hae tarinan tagit
app.get('/api/tarinat/:id/tagit', async (req, res) => {
  try {
    const tagit = await Tagi.find({ tarinaId: req.params.id }).sort({ positiivisetAanet: -1 });
    res.json(tagit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lisää tagi tarinaan
app.post('/api/tarinat/:id/tagit', varmistKayttajaTunniste, async (req, res) => {
  try {
    const { nimi, luoja } = req.body;
    const tarinaId = req.params.id;
    
    if (!nimi || !nimi.trim()) {
      return res.status(400).json({ error: 'Tagin nimi on pakollinen!' });
    }
    
    // Siivoa tagin nimi (poista #-merkki alusta ja tee lowercase)
    const siivottuNimi = nimi.trim().toLowerCase().replace(/^#/, '');
    
    // Tarkista onko tagi jo olemassa tälle tarinalle
    const olemassaOleva = await Tagi.findOne({ 
      nimi: siivottuNimi, 
      tarinaId: tarinaId 
    });
    
    if (olemassaOleva) {
      return res.status(409).json({ error: 'Tagi on jo lisätty tälle tarinalle!' });
    }
    
    const tagi = new Tagi({
      nimi: siivottuNimi,
      tarinaId: tarinaId,
      luoja: luoja || 'anonyymi',
      kayttajaId: req.kayttajaId
    });
    
    await tagi.save();
    res.status(201).json(tagi);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Äänestä tagia
app.post('/api/tagit/:id/aanesta', async (req, res) => {
  try {
    const { tyyppi } = req.body; // 'positiivinen' tai 'negatiivinen'
    const tagiId = req.params.id;
    
    // Tarkista onko käyttäjä jo äänestänyt tätä tagia
    const aanestysAvain = `tagi_aanestetty_${tagiId}`;
    
    if (req.cookies[aanestysAvain] === 'true') {
      return res.status(409).json({ 
        error: 'Olet jo äänestänyt tätä tagia',
        alreadyVoted: true
      });
    }
    
    const kentta = tyyppi === 'positiivinen' ? 'positiivisetAanet' : 'negatiivisetAanet';
    
    const tagi = await Tagi.findByIdAndUpdate(
      tagiId,
      { $inc: { [kentta]: 1 } },
      { new: true }
    );

    if (!tagi) {
      return res.status(404).json({ error: 'Tagia ei löytynyt' });
    }

    // Aseta eväste merkiksi äänestämisestä
    res.cookie(aanestysAvain, 'true', { 
      maxAge: 365 * 24 * 60 * 60 * 1000, // 365 päivää
      httpOnly: false
    });

    res.json(tagi);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tarkista onko käyttäjä äänestänyt tagia
app.get('/api/tagit/:id/aanestystila', (req, res) => {
  const tagiId = req.params.id;
  const aanestysAvain = `tagi_aanestetty_${tagiId}`;
  
  const onAanestetty = req.cookies[aanestysAvain] === 'true';
  
  res.json({
    aanestetty: onAanestetty
  });
});

// Äänestä tarinaa
app.post('/api/tarinat/:id/aanesta', async (req, res) => {
  try {
    const { tyyppi } = req.body; // 'pakina' tai 'tarina'
    const tarinaId = req.params.id;
    
    // Tarkista onko käyttäjä jo äänestänyt tätä tarinaa (kummallakin tavalla)
    const pakinaAvain = `aanestetty_${tarinaId}_pakina`;
    const tarinaAvain = `aanestetty_${tarinaId}_tarina`;
    
    if (req.cookies[pakinaAvain] === 'true' || req.cookies[tarinaAvain] === 'true') {
      return res.status(409).json({ 
        error: 'Olet jo äänestänyt tätä tarinaa',
        alreadyVoted: true
      });
    }
    
    const kentta = tyyppi === 'pakina' ? 'pakinaAanet' : 'tarinaAanet';
    
    const tarina = await Tarina.findByIdAndUpdate(
      req.params.id,
      { $inc: { [kentta]: 1 } },
      { new: true }
    );

    if (!tarina) {
      return res.status(404).json({ error: 'Tarinaa ei löytynyt' });
    }

    // Aseta eväste merkiksi äänestämisestä (voimassa 365 päivää)
    const aanestysAvain = `aanestetty_${tarinaId}_${tyyppi}`;
    res.cookie(aanestysAvain, 'true', { 
      maxAge: 365 * 24 * 60 * 60 * 1000, // 365 päivää
      httpOnly: false // Sallii JavaScript:n lukea evästettä
    });

    res.json(tarina);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tarkista onko käyttäjä äänestänyt tarinaa
app.get('/api/tarinat/:id/aanestystila', (req, res) => {
  const tarinaId = req.params.id;
  const pakinaAvain = `aanestetty_${tarinaId}_pakina`;
  const tarinaAvain = `aanestetty_${tarinaId}_tarina`;
  
  const pakinaAanestetty = req.cookies[pakinaAvain] === 'true';
  const tarinaAanestetty = req.cookies[tarinaAvain] === 'true';
  const onAanestetty = pakinaAanestetty || tarinaAanestetty;
  
  res.json({
    pakinaAanestetty: onAanestetty, // Jos on äänestänyt mitä tahansa, molemmat disabloidaan
    tarinaAanestetty: onAanestetty,
    aanestettyTyyppi: pakinaAanestetty ? 'pakina' : (tarinaAanestetty ? 'tarina' : null)
  });
});

// KÄYTTÄJIEN OMAN SISÄLLÖN HALLINTA

// Poista oma tarina
app.delete('/api/mina/tarinat/:id', varmistKayttajaTunniste, async (req, res) => {
  try {
    const tarina = await Tarina.findById(req.params.id);
    
    if (!tarina) {
      return res.status(404).json({ error: 'Tarinaa ei löytynyt' });
    }
    
    if (tarina.kayttajaId !== req.kayttajaId) {
      return res.status(403).json({ error: 'Voit poistaa vain omia tarinoitasi' });
    }
    
    // Poista myös tarinan kommentit ja tagit
    await Kommentti.deleteMany({ tarinaId: req.params.id });
    await Tagi.deleteMany({ tarinaId: req.params.id });
    
    // Poista kuvatiedosto
    if (tarina.kuva) {
      const kuvaPolku = path.join(__dirname, 'public', tarina.kuva);
      try {
        await fs.promises.unlink(kuvaPolku);
      } catch (err) {
        console.log('Kuvan poisto epäonnistui:', err.message);
      }
    }
    
    await Tarina.findByIdAndDelete(req.params.id);
    res.json({ message: 'Tarina poistettu onnistuneesti' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Poista oma kommentti
app.delete('/api/mina/kommentit/:id', varmistKayttajaTunniste, async (req, res) => {
  try {
    const kommentti = await Kommentti.findById(req.params.id);
    
    if (!kommentti) {
      return res.status(404).json({ error: 'Kommenttia ei löytynyt' });
    }
    
    if (kommentti.kayttajaId !== req.kayttajaId) {
      return res.status(403).json({ error: 'Voit poistaa vain omia kommenttejasi' });
    }
    
    // Poista kuvatiedosto
    if (kommentti.kuva) {
      const kuvaPolku = path.join(__dirname, 'public', kommentti.kuva);
      try {
        await fs.promises.unlink(kuvaPolku);
      } catch (err) {
        console.log('Kuvan poisto epäonnistui:', err.message);
      }
    }
    
    await Kommentti.findByIdAndDelete(req.params.id);
    res.json({ message: 'Kommentti poistettu onnistuneesti' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Poista oma tagi
app.delete('/api/mina/tagit/:id', varmistKayttajaTunniste, async (req, res) => {
  try {
    const tagi = await Tagi.findById(req.params.id);
    
    if (!tagi) {
      return res.status(404).json({ error: 'Tagia ei löytynyt' });
    }
    
    if (tagi.kayttajaId !== req.kayttajaId) {
      return res.status(403).json({ error: 'Voit poistaa vain omia tagejasi' });
    }
    
    await Tagi.findByIdAndDelete(req.params.id);
    res.json({ message: 'Tagi poistettu onnistuneesti' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Hae omat sisällöt
app.get('/api/mina/sisallot', varmistKayttajaTunniste, async (req, res) => {
  try {
    const tarinat = await Tarina.find({ kayttajaId: req.kayttajaId }).sort({ luotu: -1 });
    const kommentit = await Kommentti.find({ kayttajaId: req.kayttajaId }).sort({ luotu: -1 });
    const tagit = await Tagi.find({ kayttajaId: req.kayttajaId }).sort({ luotu: -1 });
    
    res.json({
      tarinat: tarinat.length,
      kommentit: kommentit.length,
      tagit: tagit.length,
      yhteensa: tarinat.length + kommentit.length + tagit.length,
      yksityiskohtia: {
        tarinat,
        kommentit,
        tagit
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Poista kaikki omat sisällöt (VAROITUS!)
app.delete('/api/mina/kaikki', varmistKayttajaTunniste, async (req, res) => {
  try {
    const { vahvistus } = req.body;
    
    if (vahvistus !== 'POISTA_KAIKKI') {
      return res.status(400).json({ error: 'Vahvistus vaaditaan. Lähetä {"vahvistus": "POISTA_KAIKKI"}' });
    }
    
    // Hae kaikki käyttäjän sisällöt
    const tarinat = await Tarina.find({ kayttajaId: req.kayttajaId });
    const kommentit = await Kommentti.find({ kayttajaId: req.kayttajaId });
    
    // Poista kuvatiedostot
    for (const tarina of tarinat) {
      if (tarina.kuva) {
        const kuvaPolku = path.join(__dirname, 'public', tarina.kuva);
        try {
          await fs.promises.unlink(kuvaPolku);
        } catch (err) {
          console.log('Kuvan poisto epäonnistui:', err.message);
        }
      }
    }
    
    for (const kommentti of kommentit) {
      if (kommentti.kuva) {
        const kuvaPolku = path.join(__dirname, 'public', kommentti.kuva);
        try {
          await fs.promises.unlink(kuvaPolku);
        } catch (err) {
          console.log('Kuvan poisto epäonnistui:', err.message);
        }
      }
    }
    
    // Poista tietokannasta
    const tarinatPoistettu = await Tarina.deleteMany({ kayttajaId: req.kayttajaId });
    const kommentitPoistettu = await Kommentti.deleteMany({ kayttajaId: req.kayttajaId });
    const tagitPoistettu = await Tagi.deleteMany({ kayttajaId: req.kayttajaId });
    
    // Poista myös kommentit käyttäjän tarinoista (ne olivat jo poistettu tarinoiden mukana)
    
    res.json({ 
      message: 'Kaikki sisältösi on poistettu onnistuneesti',
      poistettu: {
        tarinat: tarinatPoistettu.deletedCount,
        kommentit: kommentitPoistettu.deletedCount,
        tagit: tagitPoistettu.deletedCount
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN-REITIT

// Admin-kirjautuminen
app.post('/api/admin/login', async (req, res) => {
  try {
    const { salasana } = req.body;
    
    if (salasana === ADMIN_SALASANA) {
      res.cookie('adminSession', 'admin-' + ADMIN_SALASANA, {
        maxAge: 24 * 60 * 60 * 1000, // 24 tuntia
        httpOnly: true,
        sameSite: 'strict'
      });
      res.json({ message: 'Kirjauduttu sisään onnistuneesti' });
    } else {
      res.status(401).json({ error: 'Väärä salasana' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin-dashboard
app.get('/api/admin/dashboard', tarkistaAdmin, async (req, res) => {
  try {
    const tarinatMaara = await Tarina.countDocuments();
    const kommentitMaara = await Kommentti.countDocuments();
    const tagitMaara = await Tagi.countDocuments();
    
    // Viimeisimmät sisällöt
    const viimeisimmatTarinat = await Tarina.find().sort({ luotu: -1 }).limit(5);
    const viimeisimmatKommentit = await Kommentti.find().sort({ luotu: -1 }).limit(5);
    
    res.json({
      tilastot: {
        tarinat: tarinatMaara,
        kommentit: kommentitMaara,
        tagit: tagitMaara,
        yhteensa: tarinatMaara + kommentitMaara
      },
      viimeisimmat: {
        tarinat: viimeisimmatTarinat,
        kommentit: viimeisimmatKommentit
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Poista tarina
app.delete('/api/admin/tarinat/:id', tarkistaAdmin, async (req, res) => {
  try {
    const tarina = await Tarina.findById(req.params.id);
    
    if (!tarina) {
      return res.status(404).json({ error: 'Tarinaa ei löytynyt' });
    }
    
    // Poista myös tarinan kommentit ja tagit
    await Kommentti.deleteMany({ tarinaId: req.params.id });
    await Tagi.deleteMany({ tarinaId: req.params.id });
    
    // Poista kuvatiedosto
    if (tarina.kuva) {
      const kuvaPolku = path.join(__dirname, 'public', tarina.kuva);
      try {
        await fs.promises.unlink(kuvaPolku);
      } catch (err) {
        console.log('Kuvan poisto epäonnistui:', err.message);
      }
    }
    
    await Tarina.findByIdAndDelete(req.params.id);
    res.json({ message: 'Tarina poistettu onnistuneesti (Admin)' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Poista kommentti
app.delete('/api/admin/kommentit/:id', tarkistaAdmin, async (req, res) => {
  try {
    const kommentti = await Kommentti.findById(req.params.id);
    
    if (!kommentti) {
      return res.status(404).json({ error: 'Kommenttia ei löytynyt' });
    }
    
    // Poista kuvatiedosto
    if (kommentti.kuva) {
      const kuvaPolku = path.join(__dirname, 'public', kommentti.kuva);
      try {
        await fs.promises.unlink(kuvaPolku);
      } catch (err) {
        console.log('Kuvan poisto epäonnistui:', err.message);
      }
    }
    
    await Kommentti.findByIdAndDelete(req.params.id);
    res.json({ message: 'Kommentti poistettu onnistuneesti (Admin)' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Yksittäisen tarinan sivu
app.get('/tarina/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tarina.html'));
});

// Oletusreitti - palauta HTML-sivu
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Palvelin käynnissä portissa ${PORT}`);
});
