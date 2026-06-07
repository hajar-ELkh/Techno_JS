# 📚 Book Tracker — TP JavaScript / TypeScript / Express

Application web full-stack de suivi de lecture.

## Stack technique

- **Backend** : Node.js + Express.js + TypeScript
- **Base de données** : MongoDB + Mongoose
- **Frontend** : HTML + TailwindCSS (CDN)

## Structure du projet

```
book-tracker/
├── src/
│   ├── models/book.ts      ← Classe Book + Schéma Mongoose
│   ├── routes/books.ts     ← Routes Express (CRUD)
│   ├── config/db.ts        ← Connexion MongoDB
│   └── app.ts              ← Point d'entrée Express
├── public/
│   └── index.html          ← Frontend HTML/TailwindCSS
├── .env                    ← Variables d'environnement
├── package.json
└── tsconfig.json
```

## Installation et lancement

### 1. Prérequis
- Node.js >= 18
- MongoDB lancé en local (`mongod`)

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configurer l'environnement
Modifier le fichier `.env` si besoin :
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/book-tracker
```

### 4. Lancer en développement
```bash
npm run dev
```

### 5. Ouvrir dans le navigateur
```
http://localhost:3000
```

## API REST

| Méthode | Route             | Description                     |
|---------|-------------------|---------------------------------|
| GET     | /api/books        | Liste tous les livres + stats   |
| POST    | /api/books        | Crée un nouveau livre           |
| PATCH   | /api/books/:id    | Met à jour (ex: pages lues)     |
| DELETE  | /api/books/:id    | Supprime un livre               |

## Modèle Book

| Champ       | Type        | Détail                                      |
|-------------|-------------|---------------------------------------------|
| title       | string      | Titre du livre                              |
| author      | string      | Auteur                                      |
| pages       | number      | Nombre total de pages                       |
| status      | BookStatus  | Read, Re-read, DNF, Currently reading, ...  |
| price       | number      | Prix                                        |
| pagesRead   | number      | Pages lues (< pages)                        |
| format      | BookFormat  | Print, PDF, Ebook, AudioBook                |
| suggestedBy | string      | Suggéré par                                 |
| finished    | boolean     | Auto = true quand pagesRead >= pages        |

## Méthodes de la classe Book

- `currentlyAt()` → retourne le % de lecture
- `deleteBook()` → supprime le livre de la BDD
