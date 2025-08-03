# MongoDB Asennusohje Ubuntu WSL:lle

## Vaihtoehto 1: MongoDB Community Edition (Paikallinen asennus)

1. **Päivitä paketit**:
   ```bash
   sudo apt update
   ```

2. **Asenna riippuvuudet**:
   ```bash
   sudo apt install wget curl gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release
   ```

3. **Lisää MongoDB:n virallinen avain**:
   ```bash
   curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg --dearmour -o /etc/apt/trusted.gpg.d/mongodb-server-7.0.gpg
   ```

4. **Lisää MongoDB repository** (Ubuntu 24.04 Noble käyttäjille, käytä jammy):
   ```bash
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
   ```

5. **Päivitä ja asenna MongoDB**:
   ```bash
   sudo apt update
   sudo apt install mongodb-org
   ```

6. **Käynnistä MongoDB**:
   ```bash
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```

7. **Tarkista tila**:
   ```bash
   sudo systemctl status mongod
   ```

## Vaihtoehto 2: MongoDB Atlas (Pilvipalvelu) - SUOSITELTU

Helpompi ratkaisu tuotantokäyttöön:

1. Mene osoitteeseen: https://www.mongodb.com/atlas
2. Luo ilmainen tili
3. Luo uusi klustere (valitse FREE tier)
4. Luo tietokanta-käyttäjä:
   - Database Access → Add New Database User
   - Username/Password authentication
   - Tallenna käyttäjätunnus ja salasana
5. Salli IP-osoitteet:
   - Network Access → Add IP Address
   - Kehityksessä voit sallia kaikki: 0.0.0.0/0
6. Kopioi connection string:
   - Connect → Connect your application
   - Kopioi connection string
7. Päivitä `.env` tiedosto:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tarinat
   ```

## Testaus

Kun MongoDB on asennettu, testaa sovellusta:

```bash
npm start
```

Sovellus käynnistyy osoitteessa: http://localhost:3000

## Vianmääritys

### Paikallinen MongoDB
- Jos mongod ei käynnisty: `sudo systemctl restart mongod`
- Logit: `sudo journalctl -u mongod`

### MongoDB Atlas
- Tarkista yhteysmerkkijono
- Varmista että IP-osoite on sallittu
- Tarkista käyttäjätunnus/salasana
