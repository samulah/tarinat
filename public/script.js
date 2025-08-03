// API-funktiot
const API_BASE = '';

// DOM-elementit
const tarinaForm = document.getElementById('tarinaForm');
const tarinatLista = document.getElementById('tarinatLista');
const kommenttiModal = document.getElementById('kommenttiModal');
const kommenttiForm = document.getElementById('kommenttiForm');
const closeModal = document.querySelector('.close');

// Haku-elementit
const hakuKentta = document.getElementById('hakuKentta');
const tagiHaku = document.getElementById('tagiHaku');
const hakuNappi = document.getElementById('hakuNappi');
const tyhjennaHaku = document.getElementById('tyhjennaHaku');

// Tagi-modal elementit
const tagiModal = document.getElementById('tagiModal');
const tagiForm = document.getElementById('tagiForm');
const closeTagiModal = document.getElementById('closeTagiModal');

// Tapahtumakuuntelijat
document.addEventListener('DOMContentLoaded', function() {
    lataaTarinat();
    
    tarinaForm.addEventListener('submit', lisaaTarina);
    kommenttiForm.addEventListener('submit', lisaaKommentti);
    closeModal.addEventListener('click', suljeModal);
    
    // Haku-kuuntelijat
    hakuNappi.addEventListener('click', suoritaHaku);
    tyhjennaHaku.addEventListener('click', () => {
        hakuKentta.value = '';
        tagiHaku.value = '';
        lataaTarinat();
    });
    
    // Enter-näppäin hakukentissä
    hakuKentta.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') suoritaHaku();
    });
    tagiHaku.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') suoritaHaku();
    });
    
    // Tagi-modal kuuntelijat
    tagiForm.addEventListener('submit', lisaaTagi);
    closeTagiModal.addEventListener('click', suljeTagiModal);
    
    window.addEventListener('click', function(event) {
        if (event.target === kommenttiModal) {
            suljeModal();
        }
        if (event.target === tagiModal) {
            suljeTagiModal();
        }
    });
});

// Lataa tarinat palvelimelta
async function lataaTarinat() {
    try {
        naytaLataus();
        const response = await fetch(`${API_BASE}/api/tarinat`);
        
        if (!response.ok) {
            throw new Error('Tarinoiden lataus epäonnistui');
        }
        
        const tarinat = await response.json();
        await naytaTarinat(tarinat);
    } catch (error) {
        naytaVirhe('Tarinoiden lataus epäonnistui: ' + error.message);
    }
}

// Suorita haku
async function suoritaHaku() {
    try {
        naytaLataus();
        
        const hakutermi = hakuKentta.value.trim();
        const tagi = tagiHaku.value.trim();
        
        if (!hakutermi && !tagi) {
            lataaTarinat();
            return;
        }
        
        const params = new URLSearchParams();
        if (hakutermi) params.append('q', hakutermi);
        if (tagi) params.append('tagi', tagi);
        
        const response = await fetch(`${API_BASE}/api/haku?${params}`);
        
        if (!response.ok) {
            throw new Error('Haku epäonnistui');
        }
        
        const tarinat = await response.json();
        await naytaTarinat(tarinat);
        
        if (tarinat.length === 0) {
            tarinatLista.innerHTML = '<p class="loading">Hakuehdoilla ei löytynyt tarinoita. Kokeile toisia hakusanoja! 🔍</p>';
        }
        
    } catch (error) {
        naytaVirhe('Haku epäonnistui: ' + error.message);
    }
}

// Näytä tarinat sivulla
async function naytaTarinat(tarinat) {
    tarinatLista.innerHTML = '';
    
    if (tarinat.length === 0) {
        tarinatLista.innerHTML = '<p class="loading">Ei tarinoita vielä. Ole ensimmäinen joka jakaa tarinan! 📚</p>';
        return;
    }
    
    // Käsitellään tarinat järjestyksessä
    for (const tarina of tarinat) {
        const kommentit = await lataaKommentit(tarina._id);
        const tarinaElement = await luoTarinaElementti(tarina, kommentit);
        tarinatLista.appendChild(tarinaElement);
    }
    
    // Lisää klikkauskuuntelijat kuviin
    lisaaKuvienKuuntelijat();
}

// Luo tarinan HTML-elementti
async function luoTarinaElementti(tarina, kommentit) {
    const div = document.createElement('div');
    div.className = 'tarina-kortti';
    div.setAttribute('data-tarina-id', tarina._id);
    
    const aika = new Date(tarina.luotu).toLocaleString('fi-FI');
    
    // Tarkista äänestystila
    let aanestystila = { pakinaAanestetty: false, tarinaAanestetty: false };
    try {
        const response = await fetch(`${API_BASE}/api/tarinat/${tarina._id}/aanestystila`);
        if (response.ok) {
            aanestystila = await response.json();
        }
    } catch (error) {
        console.error('Äänestystilan haku epäonnistui:', error);
    }
    
    // Tarkista omistajuus
    const onOma = await tarkistaOmistajuus('tarina', tarina._id);
    
    // Lataa tagit
    let tagit = [];
    try {
        const response = await fetch(`${API_BASE}/api/tarinat/${tarina._id}/tagit`);
        if (response.ok) {
            tagit = await response.json();
        }
    } catch (error) {
        console.error('Tagien haku epäonnistui:', error);
    }
    
    div.innerHTML = `
        <div class="tarina-header">
            <div class="tarina-info">
                <a href="/tarina/${tarina._id}" class="tarina-numero-linkki">
                    <span class="tarina-numero">#${tarina.numero}</span>
                </a>
                <span class="tarina-nimimerkki">${tarina.nimimerkki}</span>
                <span class="tarina-aika">${aika}</span>
            </div>
        </div>
        <div class="tarina-content">
            <div class="tarina-media-section">
                <img src="${tarina.kuva}" alt="Tarinan kuva" class="tarina-kuva">
                <div class="tarina-teksti">${kasitteleTeksti(tarina.teksti)}</div>
            </div>
            <div class="tarina-toiminnot">
                <button class="aanesta-nappi pakina ${aanestystila.pakinaAanestetty ? 'aanestetty' : ''}" 
                        onclick="aanesta('${tarina._id}', 'pakina')"
                        ${aanestystila.pakinaAanestetty ? 'disabled' : ''}>
                    😄 Pakina (${tarina.pakinaAanet}) ${aanestystila.aanestettyTyyppi === 'pakina' ? '✓' : ''}
                </button>
                <button class="aanesta-nappi tarina ${aanestystila.tarinaAanestetty ? 'aanestetty' : ''}" 
                        onclick="aanesta('${tarina._id}', 'tarina')"
                        ${aanestystila.tarinaAanestetty ? 'disabled' : ''}>
                    📖 Tarina (${tarina.tarinaAanet}) ${aanestystila.aanestettyTyyppi === 'tarina' ? '✓' : ''}
                </button>
                <button class="kommentoi-nappi" onclick="avaaKommenttiModal('${tarina._id}')">
                    💬 Kommentoi (${kommentit.length})
                </button>
                <a href="/tarina/${tarina._id}" class="avaa-tarina-nappi">
                    🔗 Avaa tarina
                </a>
                ${onOma ? `<button class="poista-oma-nappi" onclick="poistaOmaTarina('${tarina._id}')">🗑️ Poista oma</button>` : ''}
            </div>
            ${await luoTagitHTML(tarina._id, tagit)}
            <div class="kommentit">
                ${(await Promise.all(kommentit.map(kommentti => luoKommenttiHTML(kommentti)))).join('')}
            </div>
        </div>
    `;
    
    return div;
}

// Luo kommentin HTML
async function luoKommenttiHTML(kommentti) {
    const aika = new Date(kommentti.luotu).toLocaleString('fi-FI');
    
    // Tarkista omistajuus
    const onOma = await tarkistaOmistajuus('kommentti', kommentti._id);
    
    return `
        <div class="kommentti">
            <div class="kommentti-header">
                <span class="kommentti-numero">#${kommentti.numero}</span>
                <span class="tarina-nimimerkki">${kommentti.nimimerkki}</span>
                <span class="tarina-aika">${aika}</span>
                ${onOma ? `<button class="poista-oma-kommentti-nappi" onclick="poistaOmaKommentti('${kommentti._id}')">🗑️</button>` : ''}
            </div>
            <div class="kommentti-media-section">
                <img src="${kommentti.kuva}" alt="Kommentin kuva" class="kommentti-kuva">
                <div class="kommentti-teksti">${kasitteleTeksti(kommentti.teksti)}</div>
            </div>
        </div>
    `;
}

// Lisää uusi tarina
async function lisaaTarina(event) {
    event.preventDefault();
    
    const formData = new FormData(tarinaForm);
    
    try {
        const response = await fetch(`${API_BASE}/api/tarinat`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Tarinan lisäys epäonnistui');
        }
        
        naytaOnnistuminen('Tarina lisätty onnistuneesti! 🎉');
        tarinaForm.reset();
        tyhjennaOmatSisallotCache(); // Tyhjennä cache
        await lataaTarinat();
        
    } catch (error) {
        naytaVirhe('Tarinan lisäys epäonnistui: ' + error.message);
    }
}

// Lataa tarinan kommentit
async function lataaKommentit(tarinaId) {
    try {
        const response = await fetch(`${API_BASE}/api/tarinat/${tarinaId}/kommentit`);
        
        if (!response.ok) {
            throw new Error('Kommenttien lataus epäonnistui');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Kommenttien lataus epäonnistui:', error);
        return [];
    }
}

// Avaa kommentti-modal
function avaaKommenttiModal(tarinaId) {
    document.getElementById('tarinaId').value = tarinaId;
    kommenttiModal.style.display = 'block';
}

// Sulje kommentti-modal
function suljeModal() {
    kommenttiModal.style.display = 'none';
    kommenttiForm.reset();
}

// Lisää kommentti
async function lisaaKommentti(event) {
    event.preventDefault();
    
    const formData = new FormData(kommenttiForm);
    const tarinaId = formData.get('tarinaId');
    
    try {
        const response = await fetch(`${API_BASE}/api/tarinat/${tarinaId}/kommentit`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Kommentin lisäys epäonnistui');
        }
        
        naytaOnnistuminen('Kommentti lisätty onnistuneesti! 💬');
        suljeModal();
        tyhjennaOmatSisallotCache(); // Tyhjennä cache
        await lataaTarinat();
        
    } catch (error) {
        naytaVirhe('Kommentin lisäys epäonnistui: ' + error.message);
    }
}

// Äänestä tarinaa
async function aanesta(tarinaId, tyyppi) {
    try {
        const response = await fetch(`${API_BASE}/api/tarinat/${tarinaId}/aanesta`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tyyppi })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            if (result.alreadyVoted) {
                naytaVirhe('Olet jo äänestänyt tätä tarinaa! 🗳️');
                // Päivitä vain äänien määrä ilman sivun uudelleenlatausta
                paivitaAanestysnapit(tarinaId);
                return;
            }
            throw new Error(result.error || 'Äänestys epäonnistui');
        }
        
        naytaOnnistuminen(`Äänesti ${tyyppi === 'pakina' ? 'pakinaksi' : 'tarinaksi'}! 👍`);
        // Päivitä vain äänien määrä ilman sivun uudelleenlatausta
        paivitaAanestysnapit(tarinaId);
        
    } catch (error) {
        naytaVirhe('Äänestys epäonnistui: ' + error.message);
    }
}

// Päivitä äänestysnapit yhden tarinan osalta
async function paivitaAanestysnapit(tarinaId) {
    try {
        // Hae päivitetty tarina
        const tarinaResponse = await fetch(`${API_BASE}/api/tarinat/${tarinaId}`);
        if (!tarinaResponse.ok) return;
        
        const tarina = await tarinaResponse.json();
        
        // Hae äänestystila
        const tilaResponse = await fetch(`${API_BASE}/api/tarinat/${tarinaId}/aanestystila`);
        if (!tilaResponse.ok) return;
        
        const aanestystila = await tilaResponse.json();
        
        // Etsi tarinan elementti ja päivitä napit
        const tarinaElementti = document.querySelector(`[data-tarina-id="${tarinaId}"]`);
        if (tarinaElementti) {
            const pakinaNappi = tarinaElementti.querySelector('.aanesta-nappi.pakina');
            const tarinaNappi = tarinaElementti.querySelector('.aanesta-nappi.tarina');
            
            if (pakinaNappi) {
                pakinaNappi.innerHTML = `😄 Pakina (${tarina.pakinaAanet}) ${aanestystila.aanestettyTyyppi === 'pakina' ? '✓' : ''}`;
                if (aanestystila.pakinaAanestetty) {
                    pakinaNappi.disabled = true;
                    pakinaNappi.classList.add('aanestetty');
                }
            }
            
            if (tarinaNappi) {
                tarinaNappi.innerHTML = `📖 Tarina (${tarina.tarinaAanet}) ${aanestystila.aanestettyTyyppi === 'tarina' ? '✓' : ''}`;
                if (aanestystila.tarinaAanestetty) {
                    tarinaNappi.disabled = true;
                    tarinaNappi.classList.add('aanestetty');
                }
            }
        }
    } catch (error) {
        console.error('Äänestysnapin päivitys epäonnistui:', error);
    }
}

// Apufunktiot viestien näyttämiseen
function naytaLataus() {
    tarinatLista.innerHTML = '<div class="loading">Ladataan tarinoita... ⏳</div>';
}

function naytaVirhe(viesti) {
    const virheDiv = document.createElement('div');
    virheDiv.className = 'error';
    virheDiv.textContent = viesti;
    
    // Lisää virheen ylös sivun
    const container = document.querySelector('.container');
    container.insertBefore(virheDiv, container.firstChild);
    
    // Poista viesti 5 sekunnin kuluttua
    setTimeout(() => {
        virheDiv.remove();
    }, 5000);
}

function naytaOnnistuminen(viesti) {
    const onnistuminenDiv = document.createElement('div');
    onnistuminenDiv.className = 'success';
    onnistuminenDiv.textContent = viesti;
    
    // Lisää viestin ylös sivun
    const container = document.querySelector('.container');
    container.insertBefore(onnistuminenDiv, container.firstChild);
    
    // Poista viesti 3 sekunnin kuluttua
    setTimeout(() => {
        onnistuminenDiv.remove();
    }, 3000);
}

// Kuvan suurennus funktiot
function suurennaKuva(kuvanSrc) {
    const modal = document.getElementById('kuvaModal');
    const modalImg = document.getElementById('kuvaModalImg');
    
    modal.style.display = 'block';
    modalImg.src = kuvanSrc;
}

function suljeKuvaModal() {
    const modal = document.getElementById('kuvaModal');
    modal.style.display = 'none';
}

// Käsittele värilliset tekstit
function kasitteleTeksti(teksti) {
    if (!teksti) return '';
    
    return teksti
        .split('\n')
        .map(rivi => {
            if (rivi.startsWith('>')) {
                return `<span class="green-text">${rivi.substring(1)}</span>`;
            } else if (rivi.startsWith('<')) {
                return `<span class="blue-text">${rivi.substring(1)}</span>`;
            }
            return rivi;
        })
        .join('<br>');
}

// Lisää klikkauskuuntelijat kaikkiin kuviin
function lisaaKuvienKuuntelijat() {
    const kuvat = document.querySelectorAll('.tarina-kuva, .kommentti-kuva');
    kuvat.forEach(kuva => {
        kuva.style.cursor = 'pointer';
        kuva.addEventListener('click', function() {
            suurennaKuva(this.src);
        });
    });
}

// Kuvan suurennuksen tapahtumakuuntelijat
document.addEventListener('DOMContentLoaded', function() {
    // Kuvan modal sulkeminen
    const kuvaModal = document.getElementById('kuvaModal');
    const kuvaModalClose = document.querySelector('.kuva-modal-close');
    
    if (kuvaModalClose) {
        kuvaModalClose.addEventListener('click', suljeKuvaModal);
    }
    
    if (kuvaModal) {
        kuvaModal.addEventListener('click', function(event) {
            if (event.target === kuvaModal) {
                suljeKuvaModal();
            }
        });
    }
    
    // ESC-näppäin sulkee modalin
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            suljeKuvaModal();
        }
    });
});

// Luo tagien HTML
async function luoTagitHTML(tarinaId, tagit) {
    if (tagit.length === 0) {
        return `
            <div class="tagit-osio">
                <div class="tagit-otsikko">🏷️ Tagit:</div>
                <div class="tagit-lista">
                    <em>Ei tageja vielä</em>
                </div>
                <button class="lisaa-tagi-nappi" onclick="avaaTagiModal('${tarinaId}')">
                    + Lisää tagi
                </button>
            </div>
        `;
    }
    
    let tagitHTML = '';
    for (const tagi of tagit) {
        const aanestystila = await haeTagiAanestystila(tagi._id);
        tagitHTML += `
            <div class="tagi">
                <span class="tagi-nimi">#${tagi.nimi}</span>
                <div class="tagi-aanestys">
                    <button class="tagi-nappi positiivinen" 
                            onclick="aanestaTagi('${tagi._id}', 'positiivinen')"
                            ${aanestystila.aanestetty ? 'disabled' : ''}>
                        👍 ${tagi.positiivisetAanet}
                    </button>
                    <button class="tagi-nappi negatiivinen" 
                            onclick="aanestaTagi('${tagi._id}', 'negatiivinen')"
                            ${aanestystila.aanestetty ? 'disabled' : ''}>
                        👎 ${tagi.negatiivisetAanet}
                    </button>
                </div>
            </div>
        `;
    }
    
    return `
        <div class="tagit-osio">
            <div class="tagit-otsikko">🏷️ Tagit:</div>
            <div class="tagit-lista">
                ${tagitHTML}
            </div>
            <button class="lisaa-tagi-nappi" onclick="avaaTagiModal('${tarinaId}')">
                + Lisää tagi
            </button>
        </div>
    `;
}

// Hae tagin äänestystila
async function haeTagiAanestystila(tagiId) {
    try {
        const response = await fetch(`${API_BASE}/api/tagit/${tagiId}/aanestystila`);
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Tagin äänestystilan haku epäonnistui:', error);
    }
    return { aanestetty: false };
}

// Avaa tagi-modal
function avaaTagiModal(tarinaId) {
    document.getElementById('tagiTarinaId').value = tarinaId;
    tagiModal.style.display = 'block';
}

// Sulje tagi-modal
function suljeTagiModal() {
    tagiModal.style.display = 'none';
    tagiForm.reset();
}

// Lisää tagi
async function lisaaTagi(event) {
    event.preventDefault();
    
    const formData = new FormData(tagiForm);
    const tarinaId = formData.get('tarinaId');
    
    try {
        const response = await fetch(`${API_BASE}/api/tarinat/${tarinaId}/tagit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nimi: formData.get('nimi'),
                luoja: formData.get('luoja') || 'anonyymi'
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Tagin lisäys epäonnistui');
        }
        
        naytaOnnistuminen('Tagi lisätty onnistuneesti! 🏷️');
        suljeTagiModal();
        tyhjennaOmatSisallotCache(); // Tyhjennä cache
        // Päivitä vain kyseinen tarina
        await paivitaTaginenTarina(tarinaId);
        
    } catch (error) {
        naytaVirhe('Tagin lisäys epäonnistui: ' + error.message);
    }
}

// Äänestä tagia
async function aanestaTagi(tagiId, tyyppi) {
    try {
        const response = await fetch(`${API_BASE}/api/tagit/${tagiId}/aanesta`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tyyppi })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            if (result.alreadyVoted) {
                naytaVirhe('Olet jo äänestänyt tätä tagia! 🗳️');
                return;
            }
            throw new Error(result.error || 'Tagin äänestys epäonnistui');
        }
        
        naytaOnnistuminen(`Äänesti tagia ${tyyppi === 'positiivinen' ? 'positiivisesti' : 'negatiivisesti'}! 👍`);
        
        // Päivitä tagin äänestysnapit
        await paivitaTagiNapit(tagiId, result);
        
    } catch (error) {
        naytaVirhe('Tagin äänestys epäonnistui: ' + error.message);
    }
}

// Päivitä tagin äänestysnapit
async function paivitaTagiNapit(tagiId, tagi) {
    const tagiElementti = document.querySelector(`[onclick*="${tagiId}"]`).closest('.tagi');
    if (tagiElementti) {
        const positiivinenNappi = tagiElementti.querySelector('.positiivinen');
        const negatiivinenNappi = tagiElementti.querySelector('.negatiivinen');
        
        if (positiivinenNappi) {
            positiivinenNappi.innerHTML = `👍 ${tagi.positiivisetAanet}`;
            positiivinenNappi.disabled = true;
        }
        
        if (negatiivinenNappi) {
            negatiivinenNappi.innerHTML = `👎 ${tagi.negatiivisetAanet}`;
            negatiivinenNappi.disabled = true;
        }
    }
}

// Päivitä yksittäinen tarina tagien lisäyksen jälkeen
async function paivitaTaginenTarina(tarinaId) {
    try {
        const tarinaElementti = document.querySelector(`[data-tarina-id="${tarinaId}"]`);
        if (tarinaElementti) {
            // Lataa tagit uudelleen ja päivitä vain tagit-osio
            const response = await fetch(`${API_BASE}/api/tarinat/${tarinaId}/tagit`);
            if (response.ok) {
                const tagit = await response.json();
                const tagitOsio = tarinaElementti.querySelector('.tagit-osio');
                if (tagitOsio) {
                    tagitOsio.outerHTML = await luoTagitHTML(tarinaId, tagit);
                }
            }
        }
    } catch (error) {
        console.error('Tarinan päivitys epäonnistui:', error);
    }
}

// OMIEN SISÄLTÖJEN HALLINTA

// Cache omille sisällöille
let omatSisallotCache = null;

// Hae omat sisällöt (cachetettu)
async function haeOmatSisallot() {
    if (omatSisallotCache) {
        return omatSisallotCache;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/mina/sisallot`);
        if (!response.ok) {
            throw new Error('Sisältöjen haku epäonnistui');
        }
        
        omatSisallotCache = await response.json();
        return omatSisallotCache;
    } catch (error) {
        console.error('Omien sisältöjen haku epäonnistui:', error);
        return {
            tarinat: 0,
            kommentit: 0,
            tagit: 0,
            yhteensa: 0,
            yksityiskohtia: {
                tarinat: [],
                kommentit: [],
                tagit: []
            }
        };
    }
}

// Tyhjennä cache (kun sisältö muuttuu)
function tyhjennaOmatSisallotCache() {
    omatSisallotCache = null;
}

// Tarkista onko sisältö käyttäjän oma
async function tarkistaOmistajuus(tyyppi, id) {
    try {
        const sisallot = await haeOmatSisallot();
        
        if (tyyppi === 'tarina') {
            return sisallot.yksityiskohtia.tarinat.some(tarina => tarina._id === id);
        } else if (tyyppi === 'kommentti') {
            return sisallot.yksityiskohtia.kommentit.some(kommentti => kommentti._id === id);
        } else if (tyyppi === 'tagi') {
            return sisallot.yksityiskohtia.tagit.some(tagi => tagi._id === id);
        }
        
        return false;
    } catch (error) {
        console.error('Omistajuuden tarkistus epäonnistui:', error);
        return false;
    }
}

// Poista oma tarina
async function poistaOmaTarina(tarinaId) {
    if (!confirm('Haluatko varmasti poistaa tämän tarinan? Tämä poistaa myös kaikki sen kommentit ja tagit!')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/mina/tarinat/${tarinaId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Poisto epäonnistui');
        }
        
        naytaOnnistuminen('Tarina poistettu onnistuneesti! 🗑️');
        tyhjennaOmatSisallotCache(); // Tyhjennä cache
        await lataaTarinat(); // Päivitä listaus
        
    } catch (error) {
        naytaVirhe('Tarinan poisto epäonnistui: ' + error.message);
    }
}

// Poista oma kommentti
async function poistaOmaKommentti(kommenttiId) {
    if (!confirm('Haluatko varmasti poistaa tämän kommentin?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/mina/kommentit/${kommenttiId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Poisto epäonnistui');
        }
        
        naytaOnnistuminen('Kommentti poistettu onnistuneesti! 🗑️');
        tyhjennaOmatSisallotCache(); // Tyhjennä cache
        await lataaTarinat(); // Päivitä listaus
        
    } catch (error) {
        naytaVirhe('Kommentin poisto epäonnistui: ' + error.message);
    }
}

// Poista oma tagi
async function poistaOmaTagi(tagiId) {
    if (!confirm('Haluatko varmasti poistaa tämän tagin?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/mina/tagit/${tagiId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Poisto epäonnistui');
        }
        
        naytaOnnistuminen('Tagi poistettu onnistuneesti! 🗑️');
        tyhjennaOmatSisallotCache(); // Tyhjennä cache
        await lataaTarinat(); // Päivitä listaus
        
    } catch (error) {
        naytaVirhe('Tagin poisto epäonnistui: ' + error.message);
    }
}

// Avaa oman sisällön hallintamodal
async function avaaOmatSisallotModal() {
    try {
        const sisallot = await haeOmatSisallot();
        
        // Luo modal sisältö
        const modalHTML = `
            <div id="omatSisallotModal" class="modal" style="display: block;">
                <div class="modal-content">
                    <span class="close" onclick="suljeOmatSisallotModal()">&times;</span>
                    <h3>📁 Omat sisältöni</h3>
                    
                    <div class="sisallot-tilastot">
                        <p><strong>Yhteensä:</strong> ${sisallot.yhteensa} sisältöä</p>
                        <p>📖 Tarinat: ${sisallot.tarinat}</p>
                        <p>💬 Kommentit: ${sisallot.kommentit}</p>
                        <p>🏷️ Tagit: ${sisallot.tagit}</p>
                    </div>
                    
                    <div class="sisallot-toiminnot">
                        <button onclick="naytaOmatTarinat()" class="sisalto-nappi">Näytä tarinat</button>
                        <button onclick="naytaOmatKommentit()" class="sisalto-nappi">Näytä kommentit</button>
                        <button onclick="naytaOmatTagit()" class="sisalto-nappi">Näytä tagit</button>
                        <button onclick="poistaKaikkiOmatSisallot()" class="vaara-nappi">🗑️ POISTA KAIKKI</button>
                    </div>
                    
                    <div id="sisaltoLista" class="sisalto-lista">
                        <p>Valitse toiminto yllä nähdäksesi sisältösi.</p>
                    </div>
                </div>
            </div>
        `;
        
        // Lisää modal sivulle
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Tallenna sisällöt globaalisti käyttöä varten
        window.omatSisallotData = sisallot;
        
    } catch (error) {
        console.error('Sisältöjen modal virhe:', error);
        naytaVirhe('Sisältöjen lataus epäonnistui. Jos et ole luonut sisältöä vielä tämän päivityksen jälkeen, se on normaalia.');
    }
}

// Sulje omat sisällöt modal
function suljeOmatSisallotModal() {
    const modal = document.getElementById('omatSisallotModal');
    if (modal) {
        modal.remove();
    }
}

// Näytä omat tarinat
function naytaOmatTarinat() {
    const sisaltoLista = document.getElementById('sisaltoLista');
    const tarinat = window.omatSisallotData.yksityiskohtia.tarinat;
    
    if (tarinat.length === 0) {
        sisaltoLista.innerHTML = '<p>Ei omia tarinoita.</p>';
        return;
    }
    
    const html = tarinat.map(tarina => `
        <div class="oma-sisalto-item">
            <strong>#${tarina.numero}</strong> - ${tarina.teksti.substring(0, 100)}...
            <br><small>${new Date(tarina.luotu).toLocaleString('fi-FI')}</small>
            <button onclick="poistaOmaTarina('${tarina._id}')" class="poista-nappi">🗑️ Poista</button>
        </div>
    `).join('');
    
    sisaltoLista.innerHTML = `<h4>📖 Omat tarinat (${tarinat.length})</h4>${html}`;
}

// Näytä omat kommentit
function naytaOmatKommentit() {
    const sisaltoLista = document.getElementById('sisaltoLista');
    const kommentit = window.omatSisallotData.yksityiskohtia.kommentit;
    
    if (kommentit.length === 0) {
        sisaltoLista.innerHTML = '<p>Ei omia kommentteja.</p>';
        return;
    }
    
    const html = kommentit.map(kommentti => `
        <div class="oma-sisalto-item">
            <strong>#${kommentti.numero}</strong> - ${kommentti.teksti.substring(0, 100)}...
            <br><small>${new Date(kommentti.luotu).toLocaleString('fi-FI')}</small>
            <button onclick="poistaOmaKommentti('${kommentti._id}')" class="poista-nappi">🗑️ Poista</button>
        </div>
    `).join('');
    
    sisaltoLista.innerHTML = `<h4>💬 Omat kommentit (${kommentit.length})</h4>${html}`;
}

// Näytä omat tagit
function naytaOmatTagit() {
    const sisaltoLista = document.getElementById('sisaltoLista');
    const tagit = window.omatSisallotData.yksityiskohtia.tagit;
    
    if (tagit.length === 0) {
        sisaltoLista.innerHTML = '<p>Ei omia tageja.</p>';
        return;
    }
    
    const html = tagit.map(tagi => `
        <div class="oma-sisalto-item">
            <strong>#${tagi.nimi}</strong> 
            (👍 ${tagi.positiivisetAanet} | 👎 ${tagi.negatiivisetAanet})
            <br><small>${new Date(tagi.luotu).toLocaleString('fi-FI')}</small>
            <button onclick="poistaOmaTagi('${tagi._id}')" class="poista-nappi">🗑️ Poista</button>
        </div>
    `).join('');
    
    sisaltoLista.innerHTML = `<h4>🏷️ Omat tagit (${tagit.length})</h4>${html}`;
}

// Poista kaikki omat sisällöt
async function poistaKaikkiOmatSisallot() {
    const vahvistus = prompt('VAROITUS! Tämä poistaa KAIKKI sisältösi pysyvästi!\n\nKirjoita "POISTA_KAIKKI" vahvistaaksesi:');
    
    if (vahvistus !== 'POISTA_KAIKKI') {
        naytaVirhe('Poisto peruutettu - väärä vahvistus');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/mina/kaikki`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ vahvistus: 'POISTA_KAIKKI' })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Poisto epäonnistui');
        }
        
        const result = await response.json();
        naytaOnnistuminen(`Kaikki sisältösi poistettu! (${result.poistettu.tarinat + result.poistettu.kommentit + result.poistettu.tagit} kohdetta)`);
        suljeOmatSisallotModal();
        tyhjennaOmatSisallotCache(); // Tyhjennä cache
        await lataaTarinat(); // Päivitä listaus
        
    } catch (error) {
        naytaVirhe('Kaikkien sisältöjen poisto epäonnistui: ' + error.message);
    }
}
