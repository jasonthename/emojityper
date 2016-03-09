$(document).ready(function() {
    console.log("Ready!");

    var findPreceedingSpace = function(str, index) {
        for (var spaceIndex = index; spaceIndex >= 0; spaceIndex--) {
            if (str[spaceIndex] === ' ') {
                //console.log("SpaceIndex: " + spaceIndex)
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

        // -1 because we may have just pressed space
        var prevWord = text.slice(findPreceedingSpace(text, cursorPosition - 2), cursorPosition - 1);
        return prevWord;
    }

    var replaceLast = function(str, pattern, replacement) {
        n = str.lastIndexOf(pattern);
        if (n !== -1) {
                return str.substring(0, n) + replacement + str.substring(n + pattern.length);
        }
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

    $input.keyup(function(event) {

        if ($.inArray(event.keyCode, keycodes) !== -1) {
            //debugger;
            var prevWord = $.trim(getWordBeforeCursor());
            console.log("prevword: " + prevWord);
            console.log(EMOJI_MAP);
            var emojiList = EMOJI_MAP[prevWord];
            console.table(emojiList);
            if (emojiList === undefined)  {
                return;
            }

            var newInput = replaceLast($input.val(), prevWord, emojiList[0]["emoji"]);
            console.log(newInput);
            $input.val(newInput);
        }

    });


});
