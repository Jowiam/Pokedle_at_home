# Pokedle at home

An unlimited browser-based Pokémon guessing game inspired by the clue-based
format of Pokedle. Each round is randomly selected, so players can start a
new game whenever they want.

## Publish with GitHub Pages

1. Create a GitHub repository and push this project to its `main` branch.
2. Open the repository's **Settings → Pages**.
3. Under **Build and deployment**, select **GitHub Actions** as the source.
4. The workflow in `.github/workflows/deploy-pages.yml` will deploy the site.
5. Open the URL shown in the workflow's `github-pages` environment.

The deployed site only needs these static files:

- `index.html`
- `style.css`
- `app.js`

`pkdle.py` is a local development server and is not required by GitHub Pages.

## Local development

Run:

```powershell
python pkdle.py
```

The game uses [PokéAPI](https://pokeapi.co/) for Pokémon data, so players need
an internet connection. Progress and streaks are stored locally in each
player's browser.
