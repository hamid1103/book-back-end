**Functionele Requirements**  
FR1 - Leesprofiel invullen
Als student wil ik een leesprofiel invullen, zodat de app passend leesmateriaal voor mij kan selecteren.
- De student kan vragen beantwoorden over taalniveau, genre, onderwerp, gewenste lengte en leesdoel.
- Verplichte velden zijn gemarkeerd; het profiel kan niet onvolledig worden opgeslagen. Wanneer ik (per ongeluk) weg navigeer wil ik niet opnieuw alle profielgegevens opnieuw in hoeven te vullen.
- Na opslaan krijgt de student een bevestiging.
- Er wordt een beperkte set vragen gehanteerd tijdens het Proof of Concept, kies een representatieve set (minimaal 3) uit de voorbeeldvragen.

FR2 - Leesprofiel inzien en wijzigen
Als student wil ik mijn opgeslagen leesprofiel kunnen bekijken en aanpassen, zodat mijn advies blijft kloppen als mijn voorkeuren veranderen.
- Een eerder opgeslagen profiel wordt correct getoond.
- Wijzigingen worden opgeslagen en gebruikt bij een volgend advies.
- Wanneer ik mijn leesprofiel heb aangepast, zonder deze op te slaan wil ik deze actie kunnen bevestigen of annuleren.
	
FR3 - Leesadvies ontvangen
Als student wil ik op basis van mijn profiel passende leessuggesties krijgen, zodat ik makkelijker een geschikt boek of tekst kies. 
- Na het invullen toont de app minimaal 3 suggesties. 
- Elke suggestie bevat titel, korte beschrijving en een motivatie ("waarom dit bij jou past"). 
- De suggesties komen uit de aanwezige database; er worden alleen bestaande titels getoond.
	
FR4 – Catalogus inzien
Als student wil ik de catalogus doorbladeren en filteren, zodat ik zelf gericht titels vind buiten het advies om. 
- De catalogus toont titels gepagineerd met navigatie tussen pagina's; het totaal aantal resultaten is zichtbaar. 
- De student kan filteren op relevante metadata (taalniveau, genre, onderwerp, lengte - spiegelt de profielvelden uit FR1). 
- Filters zijn combineerbaar en resetbaar. 
- Elke titel toont minimaal titel + korte beschrijving (consistent met FR3).	

FR5 – Leeslijst bijhouden Als student wil ik titels op een persoonlijke leeslijst zetten en markeren wat ik gelezen heb, zodat ik overzicht houd. 
- De student voegt een titel toe vanuit de catalogus (FR5) of het advies (FR3). 
- Elk item is te togglen tussen niet-gelezen en gelezen. 
- De leeslijst toont per item de status. 
- De leeslijst is persoonlijk; zichtbaar voor de eigenaar en de gekoppelde docent (gekoppeld aan FR6).
	
FR6 – Inzage in leeslijst door docenten Als docent wil ik de leeslijsten inzien en aanvullen, zodat ik hun leesproces volg en bijstuur. 
- De docent ziet de lijst van studenten die een leesprofiel hebben ingevuld. 
- De student koppelt zichzelf aan een docent. 
- De docent ziet uitsluitend de leeslijsten van gekoppelde studenten. 
- De docent kan een item uit de catalogus toevoegen aan de leeslijst van een gekoppelde student. 
- Toegang is rolgebaseerd afgedwongen in de back-end (NFR6).