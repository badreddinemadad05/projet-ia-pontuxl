/* =====================================================================
   server.pl — Serveur WebSocket SWI-Prolog pour PontuXL
   =====================================================================

   LANCEMENT :
   & "C:\Program Files\swipl\bin\swipl.exe" server.pl

   Le serveur ecoute sur ws://localhost:8080/ai
   JavaScript envoie : { "etat": "etat(...)", "profondeur": 2, "heuristique": "h1" }
   Prolog repond   : { "ok": true, "coup": "mouvement(X,Y,Dir,[...])" }
                  ou { "ok": false, "coup": "aucun", "erreur": "..." }

   Coordonnees : 0-5 (identiques JS et Prolog)
   ===================================================================== */

:- use_module(library(http/thread_httpd)).
:- use_module(library(http/http_dispatch)).
:- use_module(library(http/websocket)).
:- use_module(library(http/json)).
:- use_module(library(lists)).

% Charger l'IA
:- consult('ai_bot.pl').


% ===== DEMARRAGE =====

:- initialization(start_server, main).

start_server :-
    Port = 8080,
    http_server(http_dispatch, [port(Port)]),
    format("~n=== Serveur PontuXL demarre sur ws://localhost:~w/ai ===~n", [Port]),
    format("En attente de connexions...~n~n"),
    thread_get_message(_).


% ===== ROUTE WEBSOCKET =====

:- http_handler(root(ai), websocket_handler, []).

websocket_handler(Request) :-
    http_upgrade_to_websocket(handle_ws, [], Request).


% ===== BOUCLE DE GESTION =====

handle_ws(WebSocket) :-
    ws_receive(WebSocket, Message, [format(json)]),
    (   Message.opcode == close
    ->  format("Client deconnecte.~n")
    ;   Data = Message.data,
        format("Message recu de JS~n"),
        traiter_message(Data, Reponse),
        ws_send(WebSocket, json(Reponse)),
        handle_ws(WebSocket)
    ).


% ===== TRAITEMENT D'UN MESSAGE =====

traiter_message(Data, Reponse) :-
    (   catch(traiter_message_safe(Data, Reponse), Err, (
            term_to_atom(Err, ErrAtom),
            atom_string(ErrAtom, ErrStr),
            Reponse = json([ok=false, coup="aucun", erreur=ErrStr])
        ))
    ->  true
    ;   Reponse = json([ok=false, coup="aucun", erreur="Echec sans exception"])
    ).

traiter_message_safe(Data, json([ok=true, coup=CoupStr])) :-
    % Recuperer les donnees JSON
    EtatStr = Data.etat,
    ProfData = Data.profondeur,
    HeurData = Data.heuristique,

    % Convertir profondeur
    (integer(ProfData) -> Prof = ProfData ; atom_to_term(ProfData, Prof, [])),

    % Convertir heuristique
    (atom(HeurData) -> Heur = HeurData ; atom_string(Heur, HeurData)),

    % Parser l'etat depuis la chaine Prolog
    atom_to_term(EtatStr, Etat, []),

    format("Calcul du coup pour : ~w~n", [Heur]),

    % Calculer le meilleur coup
    choisir_coup_shallow(Etat, Prof, Heur, Coup),

    % Convertir le coup en chaine
    term_to_atom(Coup, CoupAtom),
    atom_string(CoupAtom, CoupStr),

    format("Coup calcule : ~w~n", [CoupStr]).