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

// Team selection management variables
let _selectedTeams = [];
let _maxSelections = 2;
let _selectionState = {
    isValid: false,
    count: 0
};

// LocalStorage key for saving data
const STORAGE_KEY = 'eloScoresData';

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

var _indexLeftTeam = null;
var _indexRightTeam = null;

var iName = 2;
var iScore = 3;
var iBattles = 4;
var iWin = 5;
var iLose = 6;
var iTie = 7;
var iGoalFor = 8;
var iGoalAgainst = 9;

var iOpWin = 10;
var iOpLose = 11;
var iOpponents = 12;
var iChange = 13;

var iPoints = 14;
var iOpScore = 15;
var iGoalDiff = 16;

var iOpTie = 17;

var iSoS = 18;
var iSoV = 19;
var iPPct = 20;

var iScalePoints = 21;

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
    var leftTeam = _dataSet[_indexLeftTeam];
    var rightTeam = _dataSet[_indexRightTeam];

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

    return leftTeam[iChange];
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

    _dataSet.push([null, 0, p_strTeamName, 1000, null, null, null, null, 0, 0, 0, 0, [], null, 0, 0, 0, 0, 0, 0, 0])
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


    var leftStyle = "tie";
    var rightStyle = "tie";

    _indexRightTeam = _arrTeams.indexOf(fixRightTeamName);
    if (_indexRightTeam < 0) {
        addTeam(fixRightTeamName);
        _indexRightTeam = _arrTeams.indexOf(fixRightTeamName);
    }

    _indexLeftTeam = _arrTeams.indexOf(fixLeftTeamName);
    if (_indexLeftTeam < 0) {
        addTeam(fixLeftTeamName);
        _indexLeftTeam = _arrTeams.indexOf(fixLeftTeamName);
    }

    var leftTeam = _dataSet[_indexLeftTeam];
    var rightTeam = _dataSet[_indexRightTeam];

    leftTeam[iOpponents].push(_indexRightTeam);
    rightTeam[iOpponents].push(_indexLeftTeam);


    var goalMultiplier = 1;

    if (_bUseScores) {
        var winnerRating = (leftScore > rightScore) ? leftTeam[iScore] : rightTeam[iScore];
        var loserRating = (rightScore > leftScore) ? rightTeam[iScore] : leftTeam[iScore];

        // https://fivethirtyeight.com/features/introducing-nfl-elo-ratings/
        goalMultiplier = Math.min(1, Math.log(Math.abs(leftScore - rightScore) + 1) * (2.2 / ((winnerRating - loserRating) * 0.001 + 2.2)));
        console.log(goalMultiplier);
    }

    var leftChangeRaw = updateRatings(p_result, true, goalMultiplier);

    var leftChange = plusMinusFormat(leftChangeRaw);
    var rightChange = plusMinusFormat(leftChangeRaw * -1);

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
    leftTeam[iGoalDiff] = plusMinusFormat(leftTeam[iGoalDiff]);

    rightTeam[iGoalAgainst] = (rightTeam[iGoalAgainst] || 0) + rightScore;
    rightTeam[iGoalFor] = (rightTeam[iGoalFor] || 0) + leftScore;
    rightTeam[iGoalDiff] = rightTeam[iGoalFor] - rightTeam[iGoalAgainst];
    rightTeam[iGoalDiff] = plusMinusFormat(rightTeam[iGoalDiff]);

    addToGraph(fixLeftTeamName, rightScore, fixRightTeamName, leftScore);

    addGameByTeam(fixLeftTeamName,
        // "<span onclick='showGames(\"" + fixLeftTeamName + "\")'>" + fixLeftTeamName + "</span>" 
        ""
        + "<span class='" + leftStyle + "'>" + rightScore + " - " + leftScore + "</span>"
        + " vs "
        + "<span class='clickme' onclick='showGames(\"" + fixRightTeamName + "\")'>" + fixRightTeamName + "</span>"
        + ` ${leftChange}`
    );

    addGameByTeam(fixRightTeamName,
        // "<span onclick='showGames(\"" + fixRightTeamName + "\")'>" + fixRightTeamName + "</span>" 
        ""
        + "<span class='" + rightStyle + "'>" + leftScore + " - " + rightScore + "</span>"
        + " vs "
        + "<span  class='clickme' onclick='showGames(\"" + fixLeftTeamName + "\")'>" + fixLeftTeamName + "</span>"
        + ` ${rightChange}`
    );


    addGameByVs(
        p_date +
        fixLeftTeamName + " vs " + fixRightTeamName,
        // "<span onclick='showGames(\"" + fixLeftTeamName + "\")'>" + fixLeftTeamName + "</span>" 
        ""
        + "<span class='" + leftStyle + "'>" + rightScore + " - " + leftScore + "</span>"
        + " vs "
        + "<span class='clickme'  onclick='showGames(\"" + fixRightTeamName + "\")'>" + fixRightTeamName + "</span>"
        + ` ${leftChange}`
    );

    addGameByVs(
        p_date +
        fixRightTeamName + " vs " + fixLeftTeamName,
        // "<span onclick='showGames(\"" + fixRightTeamName + "\")'>" + fixRightTeamName + "</span>" 
        ""
        + "<span class='" + rightStyle + "'>" + leftScore + " - " + rightScore + "</span>"
        + " vs "
        + "<span class='clickme'  onclick='showGames(\"" + fixLeftTeamName + "\")'>" + fixLeftTeamName + "</span>"
        + ` ${rightChange}`
    );
}

function plusMinusFormat(p_num) {
    return (p_num > 0) ? "+" + p_num : p_num;
}

var _strGraphBase = "graph LR"
var _strNL = "\r\n";
var _strGraph = "";
var _strGraphArr = [];
    _strGraphArr.push(_strGraphBase + _strNL)

function copyMermaid() {
    
    var copyThis = $('#graph').text();
    
    navigator.clipboard.writeText( copyThis );
    $('#toast').html(`Copied "${copyThis}"`).show(1).delay(1000).hide(1);
}

function drawGraph(p_str) {

    var strFromGames = _strGraphArr.join("");

    var strDraw = p_str || strFromGames;

    $("#graph").html(strDraw);
}

function clearGraph() {
    _strGraph = "";
    _strGraphArr = [];
    
    // Clear original graph state when clearing graph
    clearOriginalGraphState();

    $("#graph").html(_strGraph);
}

function addToGraph(p_team1, p_team1_score, p_team2, p_team2_score) {
    if (_strGraph.length == 0) {
        _strGraph += _strGraphBase + _strNL;
        _strGraphArr.push( _strGraphBase + _strNL )
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

    var strMermaidMatch = `${leftTeamClean}[${leftTeam}]${arrow}|${leftScore}-${rightScore}| ${rightTeamClean}[${righTeam}]` + _strNL;

    _strGraph += strMermaidMatch;

    _strGraphArr.push(strMermaidMatch);
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
            [3, "desc"]
            , [8, "desc"]
            , [12, "asc"]
            , [13, "desc"]
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

            // checkbox column for team selection
            { 
                title: "<input type='checkbox' id='selectAllCheckbox' style='display:none;'>", 
                className: "dt-body-center dt-head-center checkbox-column", 
                orderable: false,
                searchable: false,
                render: function(data, type, row, meta) {
                    return '<input type="checkbox" class="team-checkbox" data-team="' + row[iName] + '">';
                }
            }
            // basic labels
            , { title: "Index", className: "dt-body-right dt-head-right" }
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
        oTable.column(1, { search: 'applied', order: 'applied' }).nodes().each(function (cell, i) {
            cell.innerHTML = (i + 1);
        });
    }).draw();

    var table = $('#example').DataTable();

    $('#example tbody').on('click', 'tr', function () {


        var data = table.row(this).data();

        //console.log("click", data);

        var teamName = data[2];
        //var teamID = arrTeams.indexOf(teamName);
        //var team = dataSet[teamID];

        //console.log("team", team);

        showGames(teamName);

    });

    // Team selection checkbox event handlers
    $('#example tbody').on('click', '.team-checkbox', function(e) {
        e.stopPropagation(); // Prevent row click event
        
        var teamName = $(this).data('team');
        var isChecked = $(this).is(':checked');
        
        // Handle team selection and update all connected components
        var selectionResult = handleTeamSelection(teamName, isChecked);
        
        // If selection was prevented (max reached), ensure checkbox state is correct
        if (!selectionResult && isChecked) {
            $(this).prop('checked', false);
        }
    });


    // Initialize data from localStorage if textarea is empty
    initializeDataFromStorage();
    
    // Add event listener to save data when textarea changes
    $('#thescores').on('input change paste', function() {
        // Use a small delay to ensure the paste operation is complete
        setTimeout(function() {
            saveDataToLocalStorage();
        }, 10);
    });

    // let's capture each game in the database (only if not already processed during initialization)
    var currentData = $('#thescores').val().trim();
    if (currentData !== '') {
        processScores();
    }


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
    // Save the empty state to localStorage
    saveDataToLocalStorage();
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

    // Clear graph filtering state
    clearOriginalGraphState();
    
    // Restore original display state completely
    restoreOriginalDisplayState();

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
    // Save current data to localStorage whenever we process scores
    saveDataToLocalStorage();
    
    clearGames();
    clearGraph();
    clearError();

    _arrScheduleByTeam = [];

    // RESET global objects
    _arrTeams = [];
    _dataSet = [];
    _gamesByTeam = [];
    _gamesByVs = [];
    
    // Clear original graph state when processing new scores
    clearOriginalGraphState();

    // pickup the lines
    var lines = $('#thescores').val().split('\n');
    var pieces = [];
    var scores = [];

    var iProcessed = 0;

    // go line by line 
    for (var i = 0; i < lines.length; i++) {
        pieces = lines[i].split('\t');

        //	console.log(pieces);

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

/****************************************
*
* LocalStorage Functions
*
*****************************************/

function saveDataToLocalStorage() {
    try {
        var currentData = $('#thescores').val();
        localStorage.setItem(STORAGE_KEY, currentData);
    } catch (e) {
        console.log('Error saving to localStorage:', e);
    }
}

function loadDataFromLocalStorage() {
    try {
        var savedData = localStorage.getItem(STORAGE_KEY);
        return savedData || '';
    } catch (e) {
        console.log('Error loading from localStorage:', e);
        return '';
    }
}

function initializeDataFromStorage() {
    var currentData = $('#thescores').val().trim();
    
    // If textarea is empty, load from localStorage
    if (currentData === '') {
        var savedData = loadDataFromLocalStorage();
        if (savedData) {
            $('#thescores').val(savedData);
            processScores();
        }
    }
}


function recordGames() {

    clearGraph();

    // let's add up opponent win/loss
    updateOpponentWinLoss()

    // final call to redraw table
    updateTable();

    drawGraph();
}

/****************************************
*
* Team Selection Management Functions
*
*****************************************/

function handleTeamSelection(teamName, isSelected) {
    if (isSelected) {
        // Check if we can add more selections
        if (_selectedTeams.length >= _maxSelections) {
            // Prevent selection and uncheck the checkbox
            $('input[data-team="' + teamName + '"]').prop('checked', false);
            return false;
        }
        
        // Add team to selection
        if (_selectedTeams.indexOf(teamName) === -1) {
            _selectedTeams.push(teamName);
        }
    } else {
        // Remove team from selection
        var index = _selectedTeams.indexOf(teamName);
        if (index > -1) {
            _selectedTeams.splice(index, 1);
        }
    }
    
    // Update selection state
    updateSelectionState();
    
    // Update UI based on selection count
    updateCheckboxStates();
    
    return true;
}

function updateSelectionState() {
    _selectionState.count = _selectedTeams.length;
    _selectionState.isValid = (_selectionState.count === 2);
    
    // Update head-to-head panel visibility based on selection state
    updateHeadToHeadPanelVisibility();
    
    // Update graph filtering based on selection state
    updateGraphFiltering();
    
    // Ensure checkbox states are consistent with selection state
    validateCheckboxStates();
}

/**
 * Validate and correct checkbox states to ensure consistency with selection array
 * This handles edge cases where UI state might become inconsistent
 */
function validateCheckboxStates() {
    $('.team-checkbox').each(function() {
        var teamName = $(this).data('team');
        var shouldBeChecked = _selectedTeams.indexOf(teamName) !== -1;
        var isCurrentlyChecked = $(this).is(':checked');
        
        // Correct any inconsistencies
        if (shouldBeChecked !== isCurrentlyChecked) {
            $(this).prop('checked', shouldBeChecked);
        }
    });
}

function updateCheckboxStates() {
    if (_selectedTeams.length >= _maxSelections) {
        // Disable unchecked checkboxes when max selections reached
        $('.team-checkbox:not(:checked)').prop('disabled', true);
    } else {
        // Enable all checkboxes when under max selections
        $('.team-checkbox').prop('disabled', false);
    }
}

/****************************************
*
* Selection Utility Functions
*
*****************************************/

function getSelectedTeams() {
    return _selectedTeams.slice(); // Return a copy of the array
}

function clearAllSelections() {
    // Clear the selection array
    _selectedTeams = [];
    
    // Uncheck all checkboxes
    $('.team-checkbox').prop('checked', false);
    
    // Enable all checkboxes
    $('.team-checkbox').prop('disabled', false);
    
    // Update selection state (this will also hide the panel)
    updateSelectionState();
}

function isExactlyTwoTeamsSelected() {
    return _selectionState.isValid && _selectedTeams.length === 2;
}

function getSelectionCount() {
    return _selectedTeams.length;
}

function isValidSelectionCount() {
    return _selectionState.isValid;
}

/****************************************
*
* Head-to-Head Comparison Calculator Functions
*
*****************************************/

/**
 * Calculate win probabilities for two teams using their ELO ratings
 * @param {Array} team1Data - First team's data array from _dataSet
 * @param {Array} team2Data - Second team's data array from _dataSet
 * @returns {Object} Object containing win probabilities for both teams
 */
function calculateWinProbabilities(team1Data, team2Data) {
    if (!team1Data || !team2Data) {
        return null;
    }
    
    var team1Rating = team1Data[iScore];
    var team2Rating = team2Data[iScore];
    
    var team1WinChance = Elo.getChanceToWin(team1Rating, team2Rating);
    var team2WinChance = Elo.getChanceToWin(team2Rating, team1Rating);
    
    return {
        team1WinProbability: team1WinChance,
        team2WinProbability: team2WinChance
    };
}

/**
 * Calculate potential ELO rating changes for win/tie/loss scenarios
 * @param {Array} team1Data - First team's data array from _dataSet
 * @param {Array} team2Data - Second team's data array from _dataSet
 * @returns {Object} Object containing ELO deltas for all match outcomes
 */
function calculatePotentialELOChanges(team1Data, team2Data) {
    if (!team1Data || !team2Data) {
        return null;
    }
    
    var team1Rating = team1Data[iScore];
    var team2Rating = team2Data[iScore];
    var goalMultiplier = 1; // Default multiplier, using existing parameter
    
    // Calculate ELO changes for different outcomes
    // Result values: 1 = win, 0.5 = tie, 0 = loss
    var team1Changes = {
        win: myRound(Elo.getRatingDelta(team1Rating, team2Rating, 1, goalMultiplier), 0),
        tie: myRound(Elo.getRatingDelta(team1Rating, team2Rating, 0.5, goalMultiplier), 0),
        loss: myRound(Elo.getRatingDelta(team1Rating, team2Rating, 0, goalMultiplier), 0)
    };
    
    var team2Changes = {
        win: myRound(Elo.getRatingDelta(team2Rating, team1Rating, 1, goalMultiplier), 0),
        tie: myRound(Elo.getRatingDelta(team2Rating, team1Rating, 0.5, goalMultiplier), 0),
        loss: myRound(Elo.getRatingDelta(team2Rating, team1Rating, 0, goalMultiplier), 0)
    };
    
    return {
        team1ELOChanges: team1Changes,
        team2ELOChanges: team2Changes
    };
}

/**
 * Extract team data from _dataSet array by team name
 * @param {string} teamName - Name of the team to find
 * @returns {Array|null} Team data array or null if not found
 */
function getTeamDataByName(teamName) {
    if (!teamName || !_dataSet || _dataSet.length === 0) {
        return null;
    }
    
    for (var i = 0; i < _dataSet.length; i++) {
        if (_dataSet[i][iName] === teamName) {
            return _dataSet[i];
        }
    }
    
    return null;
}

/**
 * Format ELO changes with proper +/- notation
 * @param {number} eloChange - The ELO change value
 * @returns {string} Formatted ELO change string with +/- notation
 */
function formatELOChange(eloChange) {
    if (typeof eloChange !== 'number') {
        return '0';
    }
    
    return plusMinusFormat(eloChange);
}

/**
 * Structure comparison data for display between two teams
 * @param {string} team1Name - Name of the first team
 * @param {string} team2Name - Name of the second team
 * @returns {Object|null} Structured comparison data or null if teams not found
 */
function formatComparisonData(team1Name, team2Name) {
    if (!team1Name || !team2Name) {
        return null;
    }
    
    var team1Data = getTeamDataByName(team1Name);
    var team2Data = getTeamDataByName(team2Name);
    
    if (!team1Data || !team2Data) {
        return null;
    }
    
    // Calculate win probabilities
    var probabilities = calculateWinProbabilities(team1Data, team2Data);
    if (!probabilities) {
        return null;
    }
    
    // Calculate potential ELO changes
    var eloChanges = calculatePotentialELOChanges(team1Data, team2Data);
    if (!eloChanges) {
        return null;
    }
    
    // Structure the data for display
    var comparisonData = {
        team1: {
            fullData: team1Data,
            name: team1Name,
            eloRating: team1Data[iScore],
            winProbability: Math.round(probabilities.team1WinProbability * 100), // Convert to percentage
            eloChanges: {
                win: formatELOChange(eloChanges.team1ELOChanges.win),
                tie: formatELOChange(eloChanges.team1ELOChanges.tie),
                loss: formatELOChange(eloChanges.team1ELOChanges.loss)
            }
        },
        team2: {
            
            fullData: team2Data,
            name: team2Name,
            eloRating: team2Data[iScore],
            winProbability: Math.round(probabilities.team2WinProbability * 100), // Convert to percentage
            eloChanges: {
                win: formatELOChange(eloChanges.team2ELOChanges.win),
                tie: formatELOChange(eloChanges.team2ELOChanges.tie),
                loss: formatELOChange(eloChanges.team2ELOChanges.loss)
            }
        }
    };
    
    return comparisonData;
}

/****************************************
*
* Head-to-Head Display Panel Functions
*
*****************************************/

/**
 * Populate the head-to-head panel with team comparison data
 * @param {Object} comparisonData - Structured comparison data from formatComparisonData()
 */
function populateHeadToHeadPanel(comparisonData) {
    if (!comparisonData) {
        return;
    }
    
    console.log(comparisonData);

    var team1 = comparisonData.team1;
    var team2 = comparisonData.team2;

    var team1Full = team1.fullData;
    var team2Full = team2.fullData;
    
    var html = '';
    
    // Team comparison section
    html += '<div class="team-comparison">';
    html += '  <div class="team-info">';
    html += `    <div class="team-name">${team1.name} (${team1Full[iWin] || 0}-${team1Full[iTie] || 0}-${team1Full[iLose] || 0}) </div>`;
    html += '    <div class="team-elo">ELO: ' + team1.eloRating + '</div>';
    html += '    <div class="win-probability">' + team1.winProbability + '%</div>';
    html += '  </div>';
    html += '  <div class="vs-separator">VS</div>';
    html += '  <div class="team-info">';
    html += `    <div class="team-name">${team2.name} (${team2Full[iWin] || 0}-${team2Full[iTie] || 0}-${team2Full[iLose] || 0}) </div>`;
    html += '    <div class="team-elo">ELO: ' + team2.eloRating + '</div>';
    html += '    <div class="win-probability">' + team2.winProbability + '%</div>';
    html += '  </div>';
    html += '</div>';
    
    // ELO changes table
    html += '<table class="elo-changes-table">';
    html += '  <thead>';
    html += '    <tr>';
    html += '      <th>Outcome</th>';
    html += '      <th>' + team1.name + ' ELO Change</th>';
    html += '      <th>' + team2.name + ' ELO Change</th>';
    html += '    </tr>';
    html += '  </thead>';
    html += '  <tbody>';
    
    // Win scenario (team1 wins)
    html += '    <tr>';
    html += '      <td class="team-column">' + team1.name + ' Wins</td>';
    html += '      <td class="' + getELOChangeClass(team1.eloChanges.win) + '">' + team1.eloChanges.win + '</td>';
    html += '      <td class="' + getELOChangeClass(team2.eloChanges.loss) + '">' + team2.eloChanges.loss + '</td>';
    html += '    </tr>';
    
    // Tie scenario
    html += '    <tr>';
    html += '      <td class="team-column">Tie</td>';
    html += '      <td class="' + getELOChangeClass(team1.eloChanges.tie) + '">' + team1.eloChanges.tie + '</td>';
    html += '      <td class="' + getELOChangeClass(team2.eloChanges.tie) + '">' + team2.eloChanges.tie + '</td>';
    html += '    </tr>';
    
    // Win scenario (team2 wins)
    html += '    <tr>';
    html += '      <td class="team-column">' + team2.name + ' Wins</td>';
    html += '      <td class="' + getELOChangeClass(team1.eloChanges.loss) + '">' + team1.eloChanges.loss + '</td>';
    html += '      <td class="' + getELOChangeClass(team2.eloChanges.win) + '">' + team2.eloChanges.win + '</td>';
    html += '    </tr>';
    
    html += '  </tbody>';
    html += '</table>';
    
    // Update the panel content
    $('#comparisonData').html(html);
}

/**
 * Get CSS class for ELO change styling based on value
 * @param {string} eloChangeStr - ELO change string (e.g., "+15", "-10", "0")
 * @returns {string} CSS class name for styling
 */
function getELOChangeClass(eloChangeStr) {
    if (!eloChangeStr && eloChangeStr !== 0) {
        return 'elo-change-neutral';
    }
    
    // Convert to string if it's a number, then remove '+' sign for parsing
    var strValue = String(eloChangeStr);
    var numValue = parseFloat(strValue.replace('+', ''));
    
    if (numValue > 0) {
        return 'elo-change-positive';
    } else if (numValue < 0) {
        return 'elo-change-negative';
    } else {
        return 'elo-change-neutral';
    }
}

/**
 * Show the head-to-head panel with comparison data
 * Updates panel content and makes it visible
 */
function showHeadToHeadPanel() {
    if (!isExactlyTwoTeamsSelected()) {
        return;
    }
    
    var selectedTeams = getSelectedTeams();
    var comparisonData = formatComparisonData(selectedTeams[0], selectedTeams[1]);
    
    if (comparisonData) {
        populateHeadToHeadPanel(comparisonData);
        $('#headToHeadPanel').show();
    }
}

/**
 * Hide the head-to-head panel and clear its content
 */
function hideHeadToHeadPanel() {
    $('#headToHeadPanel').hide();
    $('#comparisonData').html('');
}

/**
 * Update panel visibility based on current selection state
 * Shows panel when exactly 2 teams selected, hides otherwise
 */
function updateHeadToHeadPanelVisibility() {
    if (isExactlyTwoTeamsSelected()) {
        showHeadToHeadPanel();
    } else {
        hideHeadToHeadPanel();
    }
}

/****************************************
*
* Graph Filtering Functions
*
*****************************************/

// Store original graph state for restoration
var _originalGraphArr = null;
var _isGraphFiltered = false;

/**
 * Filter _strGraphArr for matches involving selected teams
 * @param {string} team1Name - Name of the first selected team
 * @param {string} team2Name - Name of the second selected team
 * @returns {Array} Filtered array of graph strings containing only matches with selected teams
 */
function filterGraphForSelectedTeams(team1Name, team2Name) {
    if (!team1Name || !team2Name || !_strGraphArr || _strGraphArr.length === 0) {
        return [];
    }
    
    // Store original graph for restoration if not already stored
    if (!_originalGraphArr) {
        _originalGraphArr = _strGraphArr.slice(); // Create a copy
    }
    
    var filteredGraph = [];
    
    // Always include the graph base (first element)
    if (_strGraphArr.length > 0) {
        filteredGraph.push(_strGraphArr[0]);
    }
    
    // Clean team names for matching (same logic as nameForGraph function)
    var team1Clean = nameForGraph(team1Name);
    var team2Clean = nameForGraph(team2Name);
    
    // Filter matches that involve either selected team
    for (var i = 1; i < _strGraphArr.length; i++) {
        var graphLine = _strGraphArr[i];
        
        // Check if this graph line contains either selected team
        // Graph lines contain team names in format: TeamClean[Team Name]
        if (graphLine.indexOf(team1Clean + '[') !== -1 || 
            graphLine.indexOf(team2Clean + '[') !== -1 ||
            graphLine.indexOf('[' + team1Name + ']') !== -1 ||
            graphLine.indexOf('[' + team2Name + ']') !== -1) {
            filteredGraph.push(graphLine);
        }
    }
    
    return filteredGraph;
}

/**
 * Rebuild Mermaid graph string from filtered matches
 * @param {Array} filteredGraphArray - Array of filtered graph strings
 * @returns {string} Complete Mermaid graph string ready for display
 */
function buildFilteredGraphString(filteredGraphArray) {
    if (!filteredGraphArray || filteredGraphArray.length === 0) {
        return _strGraphBase + _strNL; // Return base graph if no matches
    }
    
    return filteredGraphArray.join('');
}

/**
 * Apply graph filtering for the currently selected teams
 * Updates the displayed graph to show only matches involving selected teams
 */
function applyGraphFiltering() {
    if (!isExactlyTwoTeamsSelected()) {
        return false;
    }
    
    var selectedTeams = getSelectedTeams();
    var team1Name = selectedTeams[0];
    var team2Name = selectedTeams[1];
    
    // Filter the graph array
    var filteredGraphArray = filterGraphForSelectedTeams(team1Name, team2Name);
    
    if (filteredGraphArray.length > 0) {
        // Update the global graph array with filtered data
        _strGraphArr = filteredGraphArray;
        _isGraphFiltered = true;
        
        // Rebuild and display the filtered graph
        var filteredGraphString = buildFilteredGraphString(filteredGraphArray);
        drawGraph(filteredGraphString);
        
        return true;
    }
    
    return false;
}

/**
 * Restore full graph display
 * Returns the graph to show all matches by restoring the original _strGraphArr
 */
function restoreFullGraph() {
    if (!_originalGraphArr || !_isGraphFiltered) {
        return false; // Nothing to restore
    }
    
    // Restore the original graph array
    _strGraphArr = _originalGraphArr.slice(); // Create a copy
    _isGraphFiltered = false;
    
    // Redraw the complete graph
    var fullGraphString = buildFilteredGraphString(_strGraphArr);
    drawGraph(fullGraphString);
    
    return true;
}

/**
 * Clear the stored original graph state
 * Called when the graph is rebuilt from scratch (e.g., new data loaded)
 */
function clearOriginalGraphState() {
    _originalGraphArr = null;
    _isGraphFiltered = false;
}

/**
 * Update graph filtering based on current team selection state
 * Applies filtering when exactly 2 teams selected, restores full graph otherwise
 */
function updateGraphFiltering() {
    if (isExactlyTwoTeamsSelected()) {
        // Apply graph filtering for the selected teams
        applyGraphFiltering();
    } else {
        // Restore full graph when selection is not exactly 2 teams
        if (_isGraphFiltered) {
            restoreFullGraph();
        }
    }
}

/**
 * Restore the original display state completely
 * This function ensures all components return to their default state
 */
function restoreOriginalDisplayState() {
    // Clear all team selections
    clearAllSelections();
    
    // Ensure graph is restored to full view
    if (_isGraphFiltered) {
        restoreFullGraph();
    }
    
    // Ensure panel is hidden and content cleared
    hideHeadToHeadPanel();
    
    // Reset checkbox states
    $('.team-checkbox').prop('disabled', false);
    
    // Validate that all states are consistent
    validateCheckboxStates();
}

