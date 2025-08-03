<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Tarinat-projekti Copilot-ohjeet

Tämä on Node.js + MongoDB -pohjainen tarina-jakosivusto. Huomioi seuraavat asiat:

## Tekniset vaatimukset
- Backend: Node.js + Express.js + MongoDB + Mongoose
- Frontend: Vanilla HTML/CSS/JavaScript (ei React/Vue/Angular)
- Tiedostojen käsittely: Multer kuvien lataamiseen
- Responsiivinen design mobile-first -periaatteella

## Tietomalli
- Tarinat: numero (juokseva), nimimerkki (oletus: "anonyymi"), kuva (pakollinen), teksti (pakollinen), äänet (pakina/tarina)
- Kommentit: numero (juokseva), tarinaId, nimimerkki, kuva (pakollinen), teksti (pakollinen)
- Käytä MongoDB:n automaattista laskuria numeroinnille

## Koodaustyyli
- Käytä suomenkielisiä muuttujanimiä ja kommentteja
- ES6+ syntaksi (async/await, arrow functions)
- Error handling try/catch -blokeilla
- Responsiivinen CSS ilman frameworkkeja
- Semanttinen HTML

## API-suunnittelu
- RESTful API-rakenne
- JSON-vastaukset
- Virheiden käsittely HTTP-statuskoodeiden mukaan
- Tiedostojen lataus multipart/form-data:lla

## Käyttöliittymä
- Puhdas ja moderni ulkoasu
- Gradientteja ja varjoja
- Hover-efektejä painikkeissa
- Modal-ikkunat kommentointiin
- Loading- ja error-tilat
