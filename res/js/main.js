$(document).ready(function() {

    var delimiters = [' ', ',', '\n'];
    console.log("Ready!");
    var replaceAt = function(str, index, character) {
            return str.substr(0, index) + character + str.substr(index+character.length);
    }

    var findPreceedingSpace = function(str, index) {
        for (var spaceIndex = index; spaceIndex >= 0; spaceIndex--) {
            if ($.inArray(str[spaceIndex], delimiters) > -1) {
                return spaceIndex;
            }
        }
        return 0;
    };
    var getWordBeforeCursor = function() {
        //var cursorPosition = window.getSelection().getRangeAt(0).startoffset;
        var cursorPosition = $input.prop('selectionStart');
        //console.log('Cursor position: ' + cursorPosition);
        var text = $input.val();

        // -2 because we just pressed space
        var prevWord = text.slice(findPreceedingSpace(text, cursorPosition - 2), cursorPosition - 1);
        return prevWord;
    }

    var replaceLast = function(str, pattern, replacement) {
        n = str.lastIndexOf(pattern);
        if (n !== -1) {
                return str.substring(0, n) + replacement + str.substring(n + pattern.length);
        }
        return null;
    }

    var replaceWordBeforeCursor = function(replacement) {

        var cursorPosition = $input.prop('selectionStart');
        var text = $input.val();
        var preceedingSpaceIndex = findPreceedingSpace(text, cursorPosition - 2);
        console.log("preceedingSpaceIndex = " + preceedingSpaceIndex);
        var wordBeforeCursor = text.slice(preceedingSpaceIndex, cursorPosition - 1);
        console.log('word before cursor: ' + wordBeforeCursor);

        var replacementText = text.substring(0, preceedingSpaceIndex) + replacement + text.substring(preceedingSpaceIndex + 1 + replacement.length);
        $input.val(replacementText);


    }

    var keycodes = [
            // Enter
            13,
            // .
            190,
            // ,
            188,
            // Shift,
            16,
            // Space
            32
    ];

    var $input = $('textarea#emoji');
    var $alt = $('span.alt');

    // Dynamically add click handlers as the emoji are created.
    $('div.alt').on('click', 'span.alt-emoji', function() {

        // It's fiiiine, just replace whatever's behind the cursor with the clicked thing.
        //$input.val(replaceAt($input.val(), $input.prop('selectionStart') - 2, $(this).attr('data-emoji')));

        //var newInput = replaceLast($input.val(), $(this).attr('data-canonical-emoji'), $(this).attr('data-emoji'));
        //
        replaceWordBeforeCursor($(this).attr('data-emoji'));


    });

    $input.keyup(function(event) {
        console.log($input.prop('selectionStart'));

        if ($.inArray(event.keyCode, keycodes) !== -1) {
            //debugger;
            var prevWord = $.trim(getWordBeforeCursor());
            console.log("prevword: " + '"' +  prevWord + '"');
            var emojiList = EMOJI_MAP[prevWord];
            console.table(emojiList);
            if (emojiList === undefined)  {
                return;
            }

            // XSS ME I DARE YOU
            $alt.html(emojiList.map(function(i) {
                return '<span class="alt-emoji" data-canonical-emoji="' + emojiList[0].emoji + '" data-emoji="' + i.emoji + '"' +'>' + i.emoji + '</span>';
            }).join(" "))
            var newInput = replaceLast($input.val(), prevWord, emojiList[0]["emoji"]);
            $input.val(newInput);
        }

    });


});
