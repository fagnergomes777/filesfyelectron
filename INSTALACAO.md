# 📦 Filesfy — Guia de Instalação

## O que é o Filesfy?
Aplicativo de recuperação de arquivos deletados. Recupera arquivos da **Lixeira** e de arquivos excluídos do sistema de arquivos.

---

## 🪟 Windows

### Requisitos
- Windows 10 ou superior (64-bit)
- **Executar como Administrador** (necessário para acessar a Lixeira e arquivos do sistema)

### Opção 1 — Instalador (recomendado)
1. Baixe o arquivo **`Filesfy Setup 1.0.0.exe`**
2. Dê duplo clique para executar o instalador
3. Se aparecer aviso do Windows SmartScreen, clique em **"Mais informações"** → **"Executar assim mesmo"**
   > ℹ️ O aviso aparece porque o aplicativo não possui assinatura digital. É seguro prosseguir.
4. Escolha o diretório de instalação e clique em **Avançar**
5. Aguarde a instalação finalizar
6. Um atalho será criado na **Área de Trabalho** e no **Menu Iniciar**
7. **Importante:** Ao abrir o Filesfy pela primeira vez, clique com o botão direito → **"Executar como administrador"**

### Opção 2 — Versão Portátil (sem instalação)
1. Baixe o arquivo **`Filesfy 1.0.0.exe`**
2. Coloque em qualquer pasta de sua preferência
3. Clique com o botão direito → **"Executar como administrador"**

---

## 🍎 macOS

> ⚠️ O build para macOS precisa ser feito em um computador Mac. Os passos abaixo descrevem como usar o app após receber o arquivo `.dmg`.

### Requisitos
- macOS 10.13 (High Sierra) ou superior
- Mac com chip Intel (x64) ou Apple Silicon (arm64)

### Instalação
1. Baixe o arquivo **`Filesfy-1.0.0.dmg`**
2. Dê duplo clique para abrir o DMG
3. Arraste o ícone do **Filesfy** para a pasta **Aplicativos**
4. Ao abrir pela primeira vez:
   - Clique com o botão direito no app → **"Abrir"**
   - Confirme na janela de aviso de segurança
5. O app estará disponível no Launchpad

---

## 🐧 Linux

### Opção 1 — AppImage (funciona em qualquer distro)
1. Baixe o arquivo **`Filesfy-1.0.0.AppImage`**
2. Dê permissão de execução:
   ```bash
   chmod +x Filesfy-1.0.0.AppImage
   ```
3. Execute:
   ```bash
   sudo ./Filesfy-1.0.0.AppImage
   ```
   > `sudo` é necessário para acessar arquivos do sistema

### Opção 2 — Pacote .deb (Ubuntu/Debian)
1. Baixe o arquivo **`filesfy_1.0.0_amd64.deb`**
2. Instale via terminal:
   ```bash
   sudo dpkg -i filesfy_1.0.0_amd64.deb
   ```
3. Abra pelo menu de aplicativos ou via terminal:
   ```bash
   sudo filesfy
   ```

---

## ❓ Perguntas Frequentes

**Por que preciso executar como Administrador?**
O acesso à Lixeira do Windows e a arquivos protegidos do sistema requer privilégios elevados.

**O Windows SmartScreen bloqueou o instalador. O que fazer?**
Clique em "Mais informações" e depois em "Executar assim mesmo". Isso ocorre porque o app não possui uma assinatura digital paga ($300–$500/ano). O aplicativo é seguro.

**O aplicativo encontrou arquivos mas não consigo recuperar. Por que?**
Certifique-se de que está executando como Administrador e que o destino de recuperação está em um disco diferente do que está sendo escaneado.

**Posso recuperar arquivos de um pendrive ou cartão de memória?**
Sim! Conecte o dispositivo, selecione-o na tela de dispositivos e inicie o escaneamento.

---

## 📁 Localização dos Arquivos Gerados

Após o build, os executáveis estão em:
```
filesfyelectron/
└── dist/
    ├── Filesfy Setup 1.0.0.exe      ← Instalador Windows
    ├── Filesfy 1.0.0.exe            ← Versão portátil Windows
    ├── Filesfy-1.0.0.dmg            ← macOS (requer build no Mac)
    ├── Filesfy-1.0.0.AppImage       ← Linux portátil
    └── filesfy_1.0.0_amd64.deb     ← Linux Ubuntu/Debian
```

---

## 🔨 Como Fazer o Build (Desenvolvedores)

### Windows
```powershell
cd filesfyelectron
npm install
npx electron-builder --win
```

### macOS (requer Mac)
```bash
cd filesfyelectron
npm install
npx electron-builder --mac
```

### Linux (requer Linux)
```bash
cd filesfyelectron
npm install
npx electron-builder --linux
```

### Todos os sistemas (via CI/CD)
```bash
npx electron-builder --win --mac --linux
```
> Para builds multiplataforma, use GitHub Actions ou outro CI com suporte a múltiplos OS.

---

*Filesfy v1.0.0 — Copyright 2026 Filesfy Inc.*
