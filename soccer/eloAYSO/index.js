/*
// REFERENCE for ELO and scoring 
// https://resources.fifa.com/image/upload/revision-of-the-fifa-coca-cola-world-ranking.pdf?cloudid=iklxmt2jejtjwf8qecba
// https://fivethirtyeight.com/features/introducing-nfl-elo-ratings/ 
*/

let _bUseScores = false;
let _bDecimal = 0;
let _kFactor = 40; //25; // higher convergence factor for younger players
let _chanceWinDivider = 600;

let _bTournamentScoring = false;


let _pointsWin = _bTournamentScoring ? 6 : 3;
let _pointsTie = _bTournamentScoring ? 3 : 1;
let _pointsLose = _bTournamentScoring ? 0 : 0;

let _pointsGoalMax = _bTournamentScoring ? 3 : 0;
let _pointsWinShutout = _bTournamentScoring ? 1 : 0;
let _pointsMax = _bTournamentScoring ? 10 : 3;

// Opponents/choices for the battles
let _arrTeams = [];
let _dataSet = [];
let _gamesByTeam = [];
let _gamesByVs = [];
let _arrScheduleByTeam = [];
let _kvpSchedulesByGame = [];

/****************************************
*
* ELO 
*
* https://github.com/moroshko/elo.js/blob/master/elo.js
*
* Adjusted to support a multiplier to account for goal differential and a variable kFactor and chance to win divider
*
*****************************************/

window.Elo = (function () {
    function getRatingDelta(myRating, opponentRating, myGamep_result, p_goalMultiplier) {
        if ([0, 0.5, 1].indexOf(myGamep_result) === -1) {
            return null;
        }

        var multiplier = p_goalMultiplier || 1;

        return _kFactor * multiplier * (myGamep_result - getChanceToWin(myRating, opponentRating));
    }

    function getChanceToWin(myRating, opponentRating) {
        return 1 / (1 + Math.pow(10, (opponentRating - myRating) / _chanceWinDivider));
    }

    function getNewRating(myRating, opponentRating, myGamep_result, p_goalMultiplier) {
        return myRating + getRatingDelta(myRating, opponentRating, myGamep_result, p_goalMultiplier);
    }

    return {
        getRatingDelta: getRatingDelta,
        getNewRating: getNewRating,
        getChanceToWin: getChanceToWin
    };
})();

/****************************************
*
* Implementation
*
*****************************************/

var left = null;
var right = null;

var iName = 1;
var iScore = 2;
var iBattles = 3;
var iWin = 4;
var iLose = 5;
var iTie = 6;
var iGoalFor = 7;
var iGoalAgainst = 8;

var iOpWin = 9;
var iOpLose = 10;
var iOpponents = 11;
var iChange = 12;

var iPoints = 13;
var iOpScore = 14;
var iGoalDiff = 15;

var iOpTie = 16;

var iSoS = 17;
var iSoV = 18;
var iPPct = 19;

var iScalePoints = 20;

function myRound(p_numToRound, p_digits) {
    var num = p_numToRound || 0;
    var dig = p_digits || 0;

    if (dig == 0) {
        return Math.round(num);
    }
    else if (dig > 0) {
        return num.toPrecision(dig);
    }
    else {
        return num;
    }
}

function updateRatings(p_p_result, p_skipUpdatingTable, p_goalMultiplier) {
    var leftTeam = _dataSet[left];
    var rightTeam = _dataSet[right];

    // delta
    leftTeam[iChange] = myRound(Elo.getRatingDelta(leftTeam[iScore], rightTeam[iScore], 1 - p_p_result, p_goalMultiplier), 0);
    rightTeam[iChange] = myRound(Elo.getRatingDelta(rightTeam[iScore], leftTeam[iScore], p_p_result, p_goalMultiplier));

    // new score 
    leftTeam[iScore] = myRound(Elo.getNewRating(leftTeam[iScore], rightTeam[iScore], 1 - p_p_result, p_goalMultiplier), 0);
    rightTeam[iScore] = myRound(Elo.getNewRating(rightTeam[iScore], leftTeam[iScore], p_p_result, p_goalMultiplier), 0);

    // battles
    leftTeam[iBattles] = (leftTeam[iBattles] || 0) + 1
    rightTeam[iBattles] = (rightTeam[iBattles] || 0) + 1;

    if (p_skipUpdatingTable) {

    }
    else {
        updateTable();
        loadButtons();
    }
}

function updateTable() {
    // clear it
    oTable.clear();

    // set data
    oTable.rows.add(_dataSet);

    // redraw
    oTable.draw();
}

function addTeam(p_strTeamName) {
    _dataSet = _dataSet || [];
    _arrTeams = _arrTeams || [];

    _dataSet.push([0, p_strTeamName, 1000, null, null, null, null, 0, 0, 0, 0, [], null, 0, 0, 0, 0, 0, 0, 0])
    _arrTeams.push(p_strTeamName);
}

function addGameByTeam(p_strMainTeam, p_strGame) {
    _gamesByTeam = _gamesByTeam || [];

    _gamesByTeam[p_strMainTeam] = _gamesByTeam[p_strMainTeam] || [];

    _gamesByTeam[p_strMainTeam].push(p_strGame);
}


function addGameByVs(p_strAvsB, p_strGame) {
    _gamesByVs = _gamesByVs || [];

    _gamesByVs[p_strAvsB] = _gamesByVs[p_strAvsB] || [];

    _gamesByVs[p_strAvsB].push(p_strGame);
}



function recordGame(p_leftTeam, p_rightTeam, p_result, leftScore, rightScore, p_date) {

    var fixRightTeamName = p_leftTeam;
    var fixLeftTeamName = p_rightTeam;

    right = _arrTeams.indexOf(fixRightTeamName);

    var leftStyle = "tie";
    var rightStyle = "tie";

    if (right < 0) {
        addTeam(fixRightTeamName);
        right = _arrTeams.indexOf(fixRightTeamName);
    }

    left = _arrTeams.indexOf(fixLeftTeamName);
    if (left < 0) {
        addTeam(fixLeftTeamName);
        left = _arrTeams.indexOf(fixLeftTeamName);
    }

    var leftTeam = _dataSet[left];
    var rightTeam = _dataSet[right];

    leftTeam[iOpponents].push(right);
    rightTeam[iOpponents].push(left);


    var goalMultiplier = 1;

    if (_bUseScores) {
        var winnerRating = (leftScore > rightScore) ? leftTeam[iScore] : rightTeam[iScore];
        var loserRating = (rightScore > leftScore) ? rightTeam[iScore] : leftTeam[iScore];

        // https://fivethirtyeight.com/features/introducing-nfl-elo-ratings/
        goalMultiplier = Math.min(1, Math.log(Math.abs(leftScore - rightScore) + 1) * (2.2 / ((winnerRating - loserRating) * 0.001 + 2.2)));
        console.log(goalMultiplier);
    }

    updateRatings(p_result, true, goalMultiplier);

    var leftPoints = 0;
    var rightPoints = 0;

    leftTeam[iPoints] += Math.min(_pointsGoalMax, rightScore);
    rightTeam[iPoints] += Math.min(_pointsGoalMax, leftScore);

    // left win 
    if (p_result == 0) {
        leftStyle = "win";
        rightStyle = "lose";

        leftPoints += _pointsWin;

        if (leftScore == 0) {
            leftPoints += _pointsWinShutout
        }

        leftTeam[iWin] = (leftTeam[iWin] || 0) + 1
        rightTeam[iLose] = (rightTeam[iLose] || 0) + 1;
    }
    // left lose
    else if (p_result == 1) {
        leftStyle = "lose";
        rightStyle = "win";

        if (rightScore == 0) {
            rightPoints += _pointsWinShutout
        }

        rightPoints += _pointsWin;

        rightTeam[iWin] = (rightTeam[iWin] || 0) + 1
        leftTeam[iLose] = (leftTeam[iLose] || 0) + 1;
    }
    // tie
    else {
        leftPoints += _pointsTie;
        rightPoints += _pointsTie;

        leftTeam[iTie] = (leftTeam[iTie] || 0) + 1
        rightTeam[iTie] = (rightTeam[iTie] || 0) + 1;
    }

    leftTeam[iPoints] = leftTeam[iPoints] + Math.min(_pointsMax, leftPoints);
    rightTeam[iPoints] = rightTeam[iPoints] + Math.min(_pointsMax, rightPoints);

    leftTeam[iGoalAgainst] = (leftTeam[iGoalAgainst] || 0) + leftScore;
    leftTeam[iGoalFor] = (leftTeam[iGoalFor] || 0) + rightScore;
    leftTeam[iGoalDiff] = leftTeam[iGoalFor] - leftTeam[iGoalAgainst];
    leftTeam[iGoalDiff] = (leftTeam[iGoalDiff] > 0) ? "+" + leftTeam[iGoalDiff] : leftTeam[iGoalDiff];

    rightTeam[iGoalAgainst] = (rightTeam[iGoalAgainst] || 0) + rightScore;
    rightTeam[iGoalFor] = (rightTeam[iGoalFor] || 0) + leftScore;
    rightTeam[iGoalDiff] = rightTeam[iGoalFor] - rightTeam[iGoalAgainst];
    rightTeam[iGoalDiff] = (rightTeam[iGoalDiff] > 0) ? "+" + rightTeam[iGoalDiff] : rightTeam[iGoalDiff];

    addToGraph(fixLeftTeamName, rightScore, fixRightTeamName, leftScore);

    addGameByTeam(fixLeftTeamName,
        // "<span onclick='showGames(\"" + fixLeftTeamName + "\")'>" + fixLeftTeamName + "</span>" 
        ""
        + "<span class='" + leftStyle + "'>" + rightScore + " - " + leftScore + "</span>"
        + " vs "
        + "<span class='clickme' onclick='showGames(\"" + fixRightTeamName + "\")'>" + fixRightTeamName + "</span>"
    );

    addGameByTeam(fixRightTeamName,
        // "<span onclick='showGames(\"" + fixRightTeamName + "\")'>" + fixRightTeamName + "</span>" 
        ""
        + "<span class='" + rightStyle + "'>" + leftScore + " - " + rightScore + "</span>"
        + " vs "
        + "<span  class='clickme' onclick='showGames(\"" + fixLeftTeamName + "\")'>" + fixLeftTeamName + "</span>"
    );


    addGameByVs(
        p_date +
        fixLeftTeamName + " vs " + fixRightTeamName,
        // "<span onclick='showGames(\"" + fixLeftTeamName + "\")'>" + fixLeftTeamName + "</span>" 
        ""
        + "<span class='" + leftStyle + "'>" + rightScore + " - " + leftScore + "</span>"
        + " vs "
        + "<span class='clickme'  onclick='showGames(\"" + fixRightTeamName + "\")'>" + fixRightTeamName + "</span>"
    );

    addGameByVs(
        p_date +
        fixRightTeamName + " vs " + fixLeftTeamName,
        // "<span onclick='showGames(\"" + fixRightTeamName + "\")'>" + fixRightTeamName + "</span>" 
        ""
        + "<span class='" + rightStyle + "'>" + leftScore + " - " + rightScore + "</span>"
        + " vs "
        + "<span class='clickme'  onclick='showGames(\"" + fixLeftTeamName + "\")'>" + fixLeftTeamName + "</span>"
    );
}

var strGraphBase = "graph LR"
var strNL = "\r\n";
var strGraph = "";

function copyMermaid() {
    navigator.clipboard.writeText($('#graph').text());
    $('#toast').html(`Copied "${p_str}"`).show(1).delay(1000).hide(1);
}

function drawGraph(p_str) {

    var strDraw = p_str || strGraph;

    $("#graph").html(strDraw);
}

function clearGraph() {
    strGraph = "";

    $("#graph").html(strGraph);
}

function addToGraph(p_team1, p_team1_score, p_team2, p_team2_score) {
    if (strGraph.length == 0) {
        strGraph += strGraphBase + strNL;
    }

    var leftTeam = p_team1;
    var righTeam = p_team2;
    var leftScore = p_team1_score;
    var rightScore = p_team2_score;

    if (p_team1_score < p_team2_score) {
        leftTeam = p_team2;
        righTeam = p_team1;
        leftScore = p_team2_score;
        rightScore = p_team1_score;
    }

    var arrow = "-->";

    if (leftScore == rightScore) {
        arrow = "<-.->";
    }

    if ((leftScore - rightScore) >= 5) {
        arrow = "==>";
    }

    var leftTeamClean = nameForGraph(leftTeam);
    var rightTeamClean = nameForGraph(righTeam);

    strGraph += `${leftTeamClean}[${leftTeam}]${arrow}|${leftScore}-${rightScore}| ${rightTeamClean}[${righTeam}]` + strNL;


}

function nameForGraph(p_str) {
    return p_str.replace(/[\s-]/g, '');
}
function updateOpponentWinLoss() {
    // go through each team
    for (var i = 0; i < _dataSet.length; i++) {
        // touch each opponent
        for (var j = 0; j < _dataSet[i][iOpponents].length; j++) {
            // and accumulate the wins and losses
            _dataSet[i][iOpWin] += _dataSet[_dataSet[i][iOpponents][j]][iWin];
            _dataSet[i][iOpLose] += _dataSet[_dataSet[i][iOpponents][j]][iLose];
            _dataSet[i][iOpTie] += _dataSet[_dataSet[i][iOpponents][j]][iTie];

            _dataSet[i][iOpScore] += _dataSet[_dataSet[i][iOpponents][j]][iScore];
        }

        // calculate strength of schedule
        _dataSet[i][iSoS] = myRound((_dataSet[i][iOpWin] / (_dataSet[i][iOpWin] + _dataSet[i][iOpLose] + _dataSet[i][iOpTie])), 2);

        _dataSet[i][iScalePoints] = myRound(_dataSet[i][iSoS] * _dataSet[i][iPoints], 2);

        // subtract MY wins and losses from opponent
        _dataSet[i][iOpWin] -= _dataSet[i][iWin];
        _dataSet[i][iOpLose] -= _dataSet[i][iLose];
        _dataSet[i][iOpTie] -= _dataSet[i][iTie];

        _dataSet[i][iOpScore] = myRound((_dataSet[i][iOpScore] / _dataSet[i][iBattles]), 0);


        _dataSet[i][iPPct] = myRound((_dataSet[i][iPoints] / (_dataSet[i][iBattles] * 3)), 2);



        /*
        
            TODO - Strength of Schedule 
            
             2016 New England Patriots had a combined record of 111–142–3 (a win percentage of 0.439, the SOS), and Patriots' wins came against teams with a combined record of 93–129–2 (a win percentage of 0.420, the SOV). 
             
        */

        // TEMP 
        // dataSet[i][iPoints] = (dataSet[i][iSoS] * dataSet[i][iPoints]).toPrecision(3);
    }
}

/****************************************
*****************************************
*
* Starter function starts it all 
*
****************************************
*****************************************/

var oTable = null;

$(document).ready(function () {

    // createDataSet( arrTeams );

    oTable = $('#example').DataTable({
        "order": [
            [2, "desc"]
            , [3, "desc"]
        ]
        , dom: 'Bfrtip'
        , paging: false
        , info: false
        , searching: false
        , rowId: iName

        /** TEMP
        , buttons: [
            'copy', 'csv', 'excel', 'pdf', 'print'
        ]**/
        , "data": _dataSet
        , "displayLength": 50

        , "columns": [

            // basic labels
            { title: "Index", className: "dt-body-right dt-head-right" }
            , { title: "Club", className: "dt-body-left dt-head-left dt-nowrap", data: iName, }

            // calculated points
            , { title: "<span title='Points'>Pts</span>", className: "dt-body-center dt-head-center", data: iPoints }
            , { title: "<span title='% of possible points'>Pts%</span>", className: "dt-body-center dt-head-center", data: iPPct }
            , { title: "<span title='SoS * Points'>Scaled</span>", className: "dt-body-center dt-head-center", data: iScalePoints }



            , { title: "<span title='Elo Rating'>Elo</span>", className: "dt-body-right dt-head-right", data: iScore }
            // , { title: "Change", className: "dt-body-center dt-head-center", data: iChange }

            // straight-up stats
            , { title: "<span title='Matches Played'>MP</span>", className: "dt-body-center dt-head-center", data: iBattles }
            , { title: "<span title='Wins'>W</span>", className: "dt-body-center dt-head-center", data: iWin }
            , { title: "<span title='Draws'>D</span>", className: "dt-body-center dt-head-center", data: iTie }
            , { title: "<span title='Losses'>L</span>", className: "dt-body-center dt-head-center", data: iLose }


            // goals scored/allowed
            , { title: "<span title='Goals For'>GF</span>", className: "dt-body-right dt-head-right", data: iGoalFor }
            , { title: "<span title='Goals Against'>GA</span>", className: "dt-body-right dt-head-right", data: iGoalAgainst }
            , { title: "<span title='Goals Differential'>GD</span>", className: "dt-body-right dt-head-right", data: iGoalDiff }

            // team's opponents strength/performance
            , { title: "<span title='Strength of schedule based on opponent average rating'>OpElo</span>", className: "dt-body-right dt-head-right", data: iOpScore }

            /*
            , { title: "<span title='Opponents wins, excluding this team'>OpWin</span>", className: "dt-body-right dt-head-right", data: iOpWin }
            , { title: "<span title='Opponents losses, excluding this team'>OpLose</span>", className: "dt-body-right dt-head-right", data: iOpLose }
            , { title: "<span title='Opponents ties, excluding this team'>OpTie</span>", className: "dt-body-right dt-head-right", data: iOpTie }
            */

            , { title: "<span title='Strength of Schedule: Opponents record'>SoS</span>", className: "dt-body-right dt-head-right", data: iSoS }
            // , { title: "<span title='Strength of Victory: record of teams this team beat'>SoV</span>", className: "dt-body-right dt-head-right", data: iSoV }

        ]
    });

    oTable.on('order.dt search.dt', function () {
        oTable.column(0, { search: 'applied', order: 'applied' }).nodes().each(function (cell, i) {
            cell.innerHTML = (i + 1);
        });
    }).draw();

    var table = $('#example').DataTable();

    $('#example tbody').on('click', 'tr', function () {


        var data = table.row(this).data();

        //console.log("click", data);

        var teamName = data[1];
        //var teamID = arrTeams.indexOf(teamName);
        //var team = dataSet[teamID];

        //console.log("team", team);

        showGames(teamName);

    });


    // let's capture each game in the database
    processScores();

    // processSchedule();

    //recordGames();
});

function showGames(p_strTeam) {
    /*
    // what are the results
    var str = p_strTeam + "<br/>" 
                + "<ol>" + "<li>" + gamesByTeam[p_strTeam].join("</li><li>") + "</li>" + "</ol>";
    
    // where how are we showing
    $("#results").html( str );
    */

    // what are the results
    var str = p_strTeam + "<br/>";

    var schedule = _arrScheduleByTeam[p_strTeam];

    if (schedule) {
        str += "<ol>";
        for (var i = 0; i < schedule.length; i++) {
            //console.log( schedule[i] );
            str += "<li>" + (_gamesByVs[schedule[i]] || _kvpSchedulesByGame[schedule[i]]) + "</li>";
        }
        str += "</ol>";

    }
    else {
        str += "<ol>" + "<li>" + _gamesByTeam[p_strTeam].join("</li><li>") + "</li>" + "</ol>";
    }

    // where how are we showing
    $("#results").html(str);

}

function clearScores() {
    $('#thescores').val("");
    clearTable();
    clearError();
    clearGames();
}

function clearTable() {
    // RESET global objects
    _arrTeams = [];
    _dataSet = [];
    _gamesByTeam = [];
    _gamesByVs = [];

    // final call to redraw table
    updateTable();

    clearError();
}

function clearGames() {
    $("#results").html("");
}

const _iGoodNumberOfPieces = 11;
const _iHomeTeamScore = 5;
const _iAwayTeamScore = 6;
const _iMatchDate = 1;
const _iHomeTeamName = 4;
const _iAwayTeamName = 7;
const _iMatchTime = 2;
const _iMatchField = 3;
function processScores() {
    clearGames();
    clearGraph();
    clearError();

    _arrScheduleByTeam = [];

    // RESET global objects
    _arrTeams = [];
    _dataSet = [];
    _gamesByTeam = [];
    _gamesByVs = [];

    // pickup the lines
    var lines = $('#thescores').val().split('\n');
    var pieces = [];
    var scores = [];

    var iProcessed = 0;

    // go line by line 
    for (var i = 0; i < lines.length; i++) {
        pieces = lines[i].split('\t');

	console.log(pieces);

        if (pieces.length != _iGoodNumberOfPieces) { continue; }

        scores = [];
        scores[0] = pieces[_iHomeTeamScore] || "";
        scores[1] = pieces[_iAwayTeamScore] || "";

        // First, store the schedule
        recordSchedule(pieces[_iMatchDate], pieces[_iHomeTeamName], pieces[_iAwayTeamName], pieces[_iMatchTime], pieces[_iMatchField])

        // but did we have a Match?  Can we store it? 

        if (scores[0].length <= 0 || scores[1].length <= 0) {
            // we got a SCHEDULE item, game not played yet.
            continue;
        }

        // convert score strings to int
        scores[0] = scores[0] * 1;
        scores[1] = scores[1] * 1;

        if (isNaN(scores[0]) || isNaN(scores[1])) { continue; }

        // we're done parsing, let's record the game

        // function recordGame( p_leftTeam,p_rightTeam , p_result, leftScore, rightScore)

        recordGame(pieces[_iHomeTeamName], pieces[_iAwayTeamName]
            , (scores[1] > scores[0]) ? 0 : (scores[0] > scores[1] ? 1 : 0.5)
            , scores[0], scores[1], pieces[_iMatchDate]);

        iProcessed++;
    }

    if (iProcessed <= 0) {
        setError("Did not find any games to process. Check input.");
    }


    // let's add up opponent win/loss
    updateOpponentWinLoss()

    // final call to redraw table
    updateTable();

    drawGraph();
}



function recordSchedule(p_date, p_home, p_away, p_time, p_field) {
    //console.log( p_date, p_home, p_away, p_time, p_field);

    var homeTeamSchedule = _arrScheduleByTeam[p_home] || [];
    var awayTeamSchedule = _arrScheduleByTeam[p_away] || [];
    _kvpSchedulesByGame = _kvpSchedulesByGame || [];

    homeTeamSchedule.push(p_date + p_home + " vs " + p_away);

    awayTeamSchedule.push(p_date + p_away + " vs " + p_home);

    _arrScheduleByTeam[p_home] = homeTeamSchedule;
    _arrScheduleByTeam[p_away] = awayTeamSchedule;

    _kvpSchedulesByGame[p_date + p_home + " vs " + p_away] =
        // "<span onclick='showGames(\"" + fixLeftTeamName + "\")'>" + fixLeftTeamName + "</span>" 
        ""
        + p_date
        + " (H) vs "
        + "<span class='clickme' onclick='showGames(\"" + p_away + "\")'>" + p_away + " " + p_time + " " + p_field + "" + "</span>"
        ;

    _kvpSchedulesByGame[p_date + p_away + " vs " + p_home] =
        // "<span onclick='showGames(\"" + fixLeftTeamName + "\")'>" + fixLeftTeamName + "</span>" 
        ""
        + p_date
        + " at "
        + "<span class='clickme' onclick='showGames(\"" + p_home + "\")'>" + p_home + " " + p_time + " " + p_field + "" + "</span>"
        ;

}

function setError(p_msg) {
    $("#error").html(p_msg);
}

function clearError() {
    $("#error").html("");
}


function recordGames() {

    clearGraph();

    // let's add up opponent win/loss
    updateOpponentWinLoss()

    // final call to redraw table
    updateTable();

    drawGraph();
}

