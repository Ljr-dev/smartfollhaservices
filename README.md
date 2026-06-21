# Smart Folha Services

Sistema local em Node.js, Express, MySQL, EJS, HTML, CSS e JavaScript puro para site público, calculadoras trabalhistas e painel administrativo.

## Requisitos

- Node.js 18 ou superior
- MySQL local

## Instalação

1. Instale as dependências:

```bash
npm install
```

2. Crie o banco no MySQL:

```sql
CREATE DATABASE smart_folha_services;
```

3. Importe o arquivo `database.sql` no banco `smart_folha_services`.

4. Crie o arquivo `.env` a partir de `.env.example`:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=smart_folha_services
SESSION_SECRET=trocar_essa_chave
```

5. Rode em desenvolvimento:

```bash
npm run dev
```

6. Acesse o site:

```text
http://localhost:3000
```

7. Acesse o painel:

```text
http://localhost:3000/login
```

## Admin inicial

O seed cria o usuário:

```text
E-mail: admin@smartfolhaservices.com.br
Senha temporária: Admin@123
```

Troque a senha antes de usar em produção. Para gerar um novo hash após `npm install`:

```bash
node -e "const bcrypt=require('bcrypt'); bcrypt.hash('NOVA_SENHA_AQUI', 10).then(console.log)"
```

Depois atualize no MySQL:

```sql
UPDATE users
SET password_hash = 'HASH_GERADO_AQUI'
WHERE email = 'admin@smartfolhaservices.com.br';
```

## Rotas públicas

- `GET /`
- `GET /servicos`
- `GET /calculadora-rescisao`
- `GET /calculadora-ferias`
- `GET /calculadora-decimo-terceiro`
- `GET /calculadora-hora-extra`
- `GET /calculadora-fgts`
- `GET /contato`
- `POST /contato`
- `POST /api/calcular/rescisao`
- `POST /api/calcular/ferias`
- `POST /api/calcular/decimo-terceiro`
- `POST /api/calcular/hora-extra`
- `POST /api/calcular/fgts`
- `POST /api/simulacoes`

## Rotas administrativas

- `GET /login`
- `POST /login`
- `POST /logout`
- `GET /admin`
- `GET /admin/leads`
- `GET /admin/leads/:id`
- `POST /admin/leads/:id/status`
- `GET /admin/formulas`
- `GET /admin/formulas/:id/editar`
- `POST /admin/formulas/:id/editar`
- `GET /admin/paginas`
- `GET /admin/paginas/:id/editar`
- `POST /admin/paginas/:id/editar`
- `GET /admin/simulacoes`
- `GET /admin/configuracoes`
- `POST /admin/configuracoes`

## Observação sobre cálculos

As calculadoras fazem estimativas iniciais. Antes de usar comercialmente, valide regras legais, CCT, incidências, descontos, afastamentos, médias e particularidades contratuais com especialista de Departamento Pessoal.
