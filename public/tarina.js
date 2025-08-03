// API-funktiot
const API_BASE = '';

// DOM-elementit
const tarinaLadataan = document.getElementById('tarinaLadataan');
const tarinaVirhe = document.getElementById('tarinaVirhe');
const tarinaContent = document.getElementById('tarinaContent');
const kommenttiModal = document.getElementById('kommenttiModal');
const kommenttiForm = document.getElementById('kommenttiForm');
const closeModal = document.querySelector('.close');

// Hae tarinan ID URL:sta
function haeTarinaId() {
    const urlParts = window.location.pathname.split('/');
    return urlParts[urlParts.length - 1];
}

// Tapahtumakuuntelijat
document.addEventListener('DOMContentLoaded', function() {
    const tarinaId = haeTarinaId();
    if (tarinaId) {
        lataaTarina(tarinaId);
    } else {
        naytaVirhe('Tarinan ID puuttuu');
    }
    
    kommenttiForm.addEventListener('submit', lisaaKommentti);
    closeModal.addEventListener('click', suljeModal);
    
    window.addEventListener('click', function(event) {
        if (event.target === kommenttiModal) {
            suljeModal();
        }
    });
    
    // Kuvan modal kuuntelijat
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

// Lataa yksittäinen tarina
async function lataaTarina(tarinaId) {
    try {
        // Lataa tarina
        const tarinaResponse = await fetch(`${API_BASE}/api/tarinat/${tarinaId}`);
        
        if (!tarinaResponse.ok) {
            if (tarinaResponse.status === 404) {
                throw new Error('Tarinaa ei löytynyt');
            }
            throw new Error('Tarinan lataus epäonnistui');
        }
        
        const tarina = await tarinaResponse.json();
        
        // Lataa kommentit
        const kommentitResponse = await fetch(`${API_BASE}/api/tarinat/${tarinaId}/kommentit`);
        let kommentit = [];
        if (kommentitResponse.ok) {
            kommentit = await kommentitResponse.json();
        }
        
        naytaTarina(tarina, kommentit);
    } catch (error) {
        naytaVirhe('Tarinan lataus epäonnistui: ' + error.message);
    }
}

// Näytä tarina sivulla
async function naytaTarina(tarina, kommentit) {
    tarinaLadataan.style.display = 'none';
    tarinaVirhe.style.display = 'none';
    tarinaContent.style.display = 'block';
    
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
    
    tarinaContent.innerHTML = `
        <div class="tarina-kortti yksittainen" data-tarina-id="${tarina._id}">
            <div class="tarina-header">
                <div class="tarina-info">
                    <span class="tarina-numero">#${tarina.numero}</span>
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
                            ${aanestystila.pakinaAanestetty || aanestystila.tarinaAanestetty ? 'disabled' : ''}>
                        😄 Pakina (${tarina.pakinaAanet}) ${aanestystila.aanestettyTyyppi === 'pakina' ? '✓' : ''}
                    </button>
                    <button class="aanesta-nappi tarina ${aanestystila.tarinaAanestetty ? 'aanestetty' : ''}" 
                            onclick="aanesta('${tarina._id}', 'tarina')"
                            ${aanestystila.tarinaAanestetty || aanestystila.pakinaAanestetty ? 'disabled' : ''}>
                        📖 Tarina (${tarina.tarinaAanet}) ${aanestystila.aanestettyTyyppi === 'tarina' ? '✓' : ''}
                    </button>
                    <button class="kommentoi-nappi" onclick="avaaKommenttiModal('${tarina._id}')">
                        💬 Kommentoi (${kommentit.length})
                    </button>
                </div>
            </div>
        </div>
        
        <div class="kommentit-otsikko">
            <h3>Kommentit (${kommentit.length})</h3>
        </div>
        
        <div class="kommentit">
            ${kommentit.length > 0 ? 
                kommentit.map(kommentti => luoKommenttiHTML(kommentti)).join('') : 
                '<p class="ei-kommentteja">Ei kommentteja vielä. Ole ensimmäinen joka kommentoi! 💬</p>'
            }
        </div>
    `;
    
    // Lisää klikkauskuuntelijat kuviin
    setTimeout(() => {
        lisaaKuvienKuuntelijat();
    }, 100);
}

// Luo kommentin HTML
function luoKommenttiHTML(kommentti) {
    const aika = new Date(kommentti.luotu).toLocaleString('fi-FI');
    
    return `
        <div class="kommentti">
            <div class="kommentti-header">
                <span class="kommentti-numero">#${kommentti.numero}</span>
                <span class="tarina-nimimerkki">${kommentti.nimimerkki}</span>
                <span class="tarina-aika">${aika}</span>
            </div>
            <div class="kommentti-media-section">
                <img src="${kommentti.kuva}" alt="Kommentin kuva" class="kommentti-kuva">
                <div class="kommentti-teksti">${kasitteleTeksti(kommentti.teksti)}</div>
            </div>
        </div>
    `;
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
        lataaTarina(tarinaId);
        
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
                // Päivitä napit disabled-tilaan
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
                if (aanestystila.pakinaAanestetty || aanestystila.tarinaAanestetty) {
                    pakinaNappi.disabled = true;
                    pakinaNappi.classList.add('aanestetty');
                }
            }
            
            if (tarinaNappi) {
                tarinaNappi.innerHTML = `📖 Tarina (${tarina.tarinaAanet}) ${aanestystila.aanestettyTyyppi === 'tarina' ? '✓' : ''}`;
                if (aanestystila.tarinaAanestetty || aanestystila.pakinaAanestetty) {
                    tarinaNappi.disabled = true;
                    tarinaNappi.classList.add('aanestetty');
                }
            }
        }
    } catch (error) {
        console.error('Äänestysnapin päivitys epäonnistui:', error);
    }
}

// Näytä virhe
function naytaVirhe(viesti) {
    tarinaLadataan.style.display = 'none';
    tarinaContent.style.display = 'none';
    tarinaVirhe.style.display = 'block';
    tarinaVirhe.textContent = viesti;
}

// Apufunktiot viestien näyttämiseen
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
