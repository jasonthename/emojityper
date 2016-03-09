function randInt(max) {
    //MFW I HAVE TO WRITE THIS FUNCTION JS PLEASE.
    return Math.floor(Math.random()*max)
}

function experiment(field, num_instances) {

    // See http://davidwalsh.name/javascript-clone-array for why this is ridiculous.
    // WE'LL JUST CONVERT TO JSON AND BACK, OF COURSE.
    var copy = JSON.parse(JSON.stringify(field));

    // Better use the strict type checking. This code will probably execute Conway's Game of Life somehow if I don't.
    var characterIndex;
    var character;
    while (num_instances !== 0) {
        characterIndex = randInt(copy.length);
        character = copy[characterIndex];
        character.hp -= 1;
        if (character.hp === 0) {
            // WOW I can't believe I have to write this either.
            // See this page, and see if you can read to the bottom without bursting into laughter:
            // http://stackoverflow.com/questions/5767325/remove-specific-element-from-an-array
            copy.splice(characterIndex, 1);
        }
        num_instances--;
        if (copy.length == 0) {
            break;
        }
    }
    return copy;
}

function simulate(board, instances, num_experiments) {
    var results = [];
    var death_chance = {}
    for (var i = 0; i < num_experiments; i++) {
        var result = experiment(board, instances);
        results.push(result);
    }

    for (var index in board) {
        // OKAY, for-in loops iterate over indexes? But...but...
        var character = board[index];
        var deaths = 0;
        for (var i in results) {
            // >this is how you check membership in an array.
            // Consider my membership cancelled.
            var result = results[i];
            var found = false;
            for (var j in result) {
                var c = result[j];
                if (c.id === character.id) {
                    found = true;
                }
            }
            if (!found) {
                deaths += 1;
            }
        }
        var percent_dead = deaths / num_experiments;

        death_chance[index] = percent_dead;
    }

    return death_chance;
}

function calculate() {

    var NUM_EXPERIMENTS = 10000;
    var enemyBoard =  $.trim($('#enemy-board').val().replace(/\s{2,}/g, ' '));
    var boardRe = new RegExp("^[0-9 ]+$");
    if (!enemyBoard || boardRe.exec(enemyBoard) == null) {
        return;
    }
    var selected = $("select.hero").val();
    for (var i = 0; i < parseInt(selected); i++) {
        enemyBoard += " 99999";
    }

    var board = enemyBoard.split(" ").map(function(x) {
        // mfw this js hack. Try:
        // ["10", "10", "10", "10"].map(parseInt)
        // to see why js is a production quality language
        return parseInt(x);
    })

    for (var i = 0; i < board.length; i++) {
        // Give every minion an identifier.
        board[i] = {
            id : i,
            hp: board[i]
        }
    }

    var inInstances = parseInt($('input.instances').val());
    if (!inInstances) {
        return;
    }
    var probabilities = simulate(board, inInstances, NUM_EXPERIMENTS);

    var $template = $('div.result').clone();
    $('div.result').addClass("titles");
    var $resultsDiv = $('div.results');
    // Remove the results of the previous calculation, but keep the template.
    $resultsDiv.children().slice(1).remove();
    var results = [];

    $.each(probabilities, function(index, prob) {
        var $result = $template.clone();
        $result.find('span.hp').text(board[index].hp);
        var intProb = Math.round(prob * 100);
        $result.find('span.prob').text(intProb + "%");
        if (intProb > 75) {
            $result.find('span.prob').addClass("green");
        }
        else if (intProb < 25) {
            $result.find('span.prob').addClass("red");
        }
        $result.show();
        $result.css("display: inline;");
        results.push($result.html());
    });

    // Slice off the heroes if we added them.
    if (selected > 0) {
        results = results.slice(0, -selected);
    }

    $.each(results, function(index, result) {
        $resultsDiv.append(result);
    });

    $resultsDiv.show();
}

function main() {
    $('button.btn-main').on('click', calculate);
    $('a.details').on('click', function() {
        $('p.details').fadeToggle(100)
    });
    $('input').keypress(function (e) {
      if (e.which == 13) {
        calculate()
        return false;
      }
    });

}

main();
console.log("( ͡° ͜ʖ ͡°)");
