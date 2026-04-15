# Codex Review - Reset UX pentru demo

## 1. Diagnosticul real

Demo-ul a devenit greu de inteles nu pentru ca modelul teoretic ar fi gresit, ci pentru ca interfata a expus prea direct ontologia interna a motorului.

Pe scurt, s-au amestecat patru lucruri care trebuiau separate:

1. contractul auditabil al bibliotecii,
2. nevoia unui cercetator de a inspecta toate obiectele simbolice,
3. nevoia unui utilizator de a intelege rapid ce se intampla,
4. nevoia articolului de a ancora conceptul in ruliologie si teoria categoriilor.

Rezultatul a fost o interfata care spune adevarul despre sistem, dar il spune intr-o ordine pedagogic gresita.

## 2. De ce pare totul atat de complicat

Complexitatea actuala vine dintr-o alegere de produs, nu dintr-o eroare locala de styling:

1. Demo-ul a fost construit "din interior spre exterior". A pornit din `O(x)`, `T(Oi,d)`, `N(O(x))`, `F`, urme, CNL, echivalente, transformari, intrebari, update-uri.
2. Specificatiile, mai ales `DS001`, `DS002` si `DS009`, cer onestitate epistemica si trasabilitate. Asta e corect pentru nucleul bibliotecii.
3. UI-ul a confundat insa "ce trebuie sa ramana disponibil" cu "ce trebuie sa fie vazut imediat".
4. Cand pui simultan graful complet, meta-carduri, sumarul experimentului, inspectorul de noduri, stage focus, meaning tabs si exportul, utilizatorul nu mai vede o idee. Vede un debugger.

Pe scurt: problema nu este ca sistemul este prea formal. Problema este ca formalismul a ajuns prea devreme pe ecran.

## 3. Unde s-a pierdut legatura cu ruliologia

Legatura exista in cod si in specificatii, dar nu mai era vizibila in experienta.

Ruliologia, in acest proiect, inseamna:

1. sa nu sari direct la o eticheta finala,
2. sa tratezi teoriile apropiate ca un vecinat local de posibilitati rule-bearing,
3. sa vezi intrebarile ca miscari controlate prin acel vecinat,
4. sa tratezi frontiera ca forma operationala a retinerii incertitudinii.

Demo-ul vechi nu facea asta perceptibil, pentru ca:

1. graful nu era obiectul principal al atentiei,
2. vecinatatea locala nu era introdusa progresiv,
3. utilizatorul nu era invatat sa citeasca graful ca geometrie a posibilitatilor apropiate,
4. frontiera era doar una dintre multe panouri, nu suprafata centrala a incertitudinii.

Astfel, ruliologia nu a disparut din sistem. A disparut din ordinea explicatiei.

## 4. Unde s-a pierdut legatura cu teoria categoriilor

Nici aici problema nu a fost lipsa conceptelor, ci lipsa punerii lor in scena.

In proiect, intuitia categoriala este modesta si onesta:

1. ipotezele si teoriile sunt obiecte tipate,
2. transformările locale sunt morfisme tipate,
3. clasele de echivalenta sunt compresii de tip quotient-like,
4. update-ul dupa raspuns este un morfism intre stari ale frontierei.

Demo-ul vechi reducea asta la text secundar de tip "category lens", dar fara o ordonare vizuala care sa faca aceste relatii evidente.

Cand utilizatorul vede toate panourile deodata, nu mai percepe:

1. obiectele,
2. morfismele,
3. quotient-ul,
4. tranzitia explicita dintre doua frontiere.

Din nou: teoria categoriilor nu lipsea din model. Lipsea din dramaturgia interfetei.

## 5. Principiile de redesign

Refacerea UX trebuia sa respecte patru reguli tari:

1. un singur obiect al atentiei pe ecran, la un moment dat,
2. graful sa fie central, fullscreen si citibil,
3. input-ul, harta si output-ul sa fie separate clar,
4. exportul canonic sa vina ultimul, nu primul.

## 6. Planul executat in aceasta tura

### A. Suprafata principala

Am refacut demo-ul in jurul a patru taburi clare:

1. `Walkthrough`
2. `Input`
3. `Graph`
4. `Output`

Intentia este simpla:

1. `Walkthrough` invata,
2. `Input` arata ce intra,
3. `Graph` arata geometria simbolica,
4. `Output` arata ce ramane si ce se exporta.

### B. Tutorial cu focus unic

Walkthrough-ul a fost refacut ca secventa ghidata in cinci pasi:

1. `Source`
2. `Ambiguity`
3. `Map`
4. `Question`
5. `Output`

Fiecare pas are un singur mesaj central. Detaliile tehnice au fost mutate din suprafata primara.

### C. Graful ca artefact principal

Graful a fost mutat intr-o suprafata dedicata:

1. mare,
2. navigabila,
3. fullscreen,
4. cu lens-uri explicite: `Source`, `Observation`, `Frontier`, `Question`, `Outcome`, `Full map`.

Acum utilizatorul poate citi progresiv harta si doar apoi deschide intreaga geometrie.

### D. Input si output separate

Datele de intrare nu mai concureaza cu interpretarea finala.

Input-ul a fost impartit in:

1. `Source`
2. `Cues`
3. `Hypotheses`

Output-ul a fost impartit in:

1. `Summary`
2. `Frontier`
3. `Export`

Aceasta separatie readuce ordinea epistemica corecta: sursa, apoi structura, apoi rezultat.

### E. Exportul canonic redus la rolul corect

CNL-ul nu mai invadeaza experienta initiala. Acum apare doar in `Output > Export`, impreuna cu un preview compact al familiilor canonice.

Exact cum cer specificatiile: exportul este audit surface, nu scena principala.

## 7. Ce s-a reparat conceptual

Dupa redesign, relatia cu fundatia initiala devine din nou vizibila:

1. ruliologia apare ca vecinat local de teorii si ca miscare prin frontiera,
2. teoria categoriilor apare ca relatie dintre obiecte, transformari, clase de echivalenta si update-uri,
3. frontiera redevine suprafata centrala a incertitudinii,
4. utilizatorul nu mai este fortat sa decodeze ontologia interna inainte sa inteleaga povestea.

## 8. Ce ramane pentru o iteratie urmatoare

Refactorul actual rezolva ruptura mare de UX. Pentru o iteratie urmatoare merita adaugate:

1. scene si mai specifice pe experiment, nu doar pe structura comuna,
2. animatii discrete pentru contractia frontierei si pentru branching,
3. un mod explicit de comparatie intre doua rulari parinte-copil,
4. un mic audit uman pe utilizatori reali, in spiritul `DS009`.

## 9. Concluzia de produs

Directia corecta nu este sa ascundem formalismul. Directia corecta este sa il ordonam.

Biblioteca trebuie sa ramana auditabila si teoretic onesta.
Demo-ul trebuie sa ramana inteligibil si secvential.

Cand aceste doua lucruri sunt amestecate pe acelasi ecran, iese haos.
Cand sunt separate printr-o ierarhie buna a atentiei, exact aceleasi obiecte devin explicabile.
