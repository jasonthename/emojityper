// Hello you probably don't want to be involved with this js spaghetti, you probably want emojimap.js

$(document).ready(function() {

    var delimiters = [' ', ',', '\n'];

    var clearSuggestions = function() {
        $('span.alt-emoji').remove();
        $('div.alt').hide();
    }

    // Gets a list of the 'characters' in a string, treating each unicode 'character' as a single character.
    // If you try just indexing a regular js string, you'll see the true jank of js and unicode
    var getSymbols = function(string) {
      var index = 0;
      var length = string.length;
      var output = [];
      for (; index < length - 1; ++index) {
        var charCode = string.charCodeAt(index); if (charCode >= 0xD800 && charCode <= 0xDBFF) {
          charCode = string.charCodeAt(index + 1);
          if (charCode >= 0xDC00 && charCode <= 0xDFFF) {
            output.push(string.slice(index, index + 2));
            ++index;
            continue;
          }
        }
        output.push(string.charAt(index));
      }
      output.push(string.charAt(index));
      return output;
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
        var cursorPosition = $input.prop('selectionStart');
        var text = $input.val();

        // -2 because we just pressed space
        var prevWord = text.slice(findPreceedingSpace(text, cursorPosition - 2), cursorPosition - 1);
        return prevWord;
    }

    var replaceLast = function(str, pattern, replacement) {
        // Replace the last occurrence of a pattern in a string.
        n = str.lastIndexOf(pattern);
        if (n !== -1) {
                return str.substring(0, n) + replacement + str.substring(n + pattern.length);
        }
        return null;
    }

    var replaceBeforeCursor = function(replacement) {
        // Replace the occurrence of `pattern` immediately before the cursor with `replacement`.

        var cursorPosition = $input.prop('selectionStart');
        var text = $input.val();
        var lastIndexOfPattern = text.lastIndexOf(pattern);
        var replacementText = text.substring(0, lastIndexOfPattern) + replacement + text.substring(lastIndexOfPattern + pattern.length);
        $input.val(replacementText);
    }

    var keycodes = [
            // Enter
            13,
            // .
            190,
            // ,
            188,
            // Space
            32
    ];

    var $input = $('input#emoji');
    var $alt = $('p.alt');

    // Dynamically add click handlers as the emoji are created.
    $('div.alt').on('click', 'span.alt-emoji', function() {

        // It's fiiiine, just replace whatever's behind the cursor with the clicked thing.
        var newInput = replaceLast($input.val(), $(this).attr('data-canonical-emoji'), $(this).attr('data-emoji'));
        $input.val(newInput);
        clearSuggestions();
        $input.focus();
    });

    $input.click(function() {
        // Clear the suggestions when clicked so it's clear that you can only change emoji right after typing one.
        clearSuggestions();
    });

    $input.keyup(function(event) {
        $input.attr('disabled', true);
        clearSuggestions();

        if ($.inArray(event.keyCode, keycodes) !== -1) {
            var prevWord = $.trim(getWordBeforeCursor());
            //console.log("prevword: " + '"' +  prevWord + '"');
            var emojiList = EMOJI_MAP[prevWord.toLowerCase()];
            //console.table(emojiList);
            if (emojiList === undefined)  {
                $input.attr('disabled', false);
                return;
            }

            $alt.html(emojiList.map(function(i) {
                return '<span class="alt-emoji" data-canonical-emoji="' + emojiList[0].emoji + '" data-emoji="' + i.emoji + '"' +'>' + i.emoji + '</span>';
            }).join(" "))
            // Replace the contents of the textarea with The Good Stuff
            var newInput = replaceLast($input.val(), prevWord, emojiList[0]["emoji"]);

            // XSS YOURSELF I DARE YOU
            $input.val(newInput);

            // Make HTML for each of the suggestions.
            var alt_emoji_html = emojiList.map(function(i) {
                return '<span class="alt-emoji btn btn-primary" alt="' + i.name + '" data-canonical-emoji="' + emojiList[0].emoji + '" data-emoji="' + i.emoji + '"' +'>' + i.emoji + '</span>';
            });

            // Don't show the suggestion box if there isn't  more than one. .
            if (alt_emoji_html.length < 2) {
                $input.attr('disabled', false);
                return;
            }

            // XSS ME I DARE YOU
            $alt.html(alt_emoji_html.join('\n'));

            // mmmm damn that's some smooth UX
            $('div.alt').fadeIn(100);

            $('button.copy').show();
        }

        $input.attr('disabled', false);

    });

    var clipboard = new Clipboard('button.copy');
    var $clipboardBtn = $('button.copy');
    clipboard.on('success', function(e) {
        console.log("Copied!");
        $clipboardBtn.text('Copied!');
        window.setTimeout(function() {
            $clipboardBtn.text('Copy to clipboard');
        }, 1000);

        e.clearSelection();
    });

    // Focus the input on pageload damn that's a smooth UX.
    $input.focus();


});
