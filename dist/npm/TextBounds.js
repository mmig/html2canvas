'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.parseTextBounds = exports.TextBounds = undefined;

var _Bounds = require('./Bounds');

var _textDecoration = require('./parsing/textDecoration');

var _fontVariantLigatures = require('./parsing/fontVariantLigatures');

var _Feature = require('./Feature');

var _Feature2 = _interopRequireDefault(_Feature);

var _Unicode = require('./Unicode');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var TextBounds = exports.TextBounds = function TextBounds(text, bounds) {
    _classCallCheck(this, TextBounds);

    this.text = text;
    this.bounds = bounds;
};

var parseTextBounds = exports.parseTextBounds = function parseTextBounds(value, parent, node) {
    var letterRendering = parent.style.letterSpacing !== 0;
    var textList = letterRendering ? (0, _Unicode.toCodePoints)(value).map(function (i) {
        return (0, _Unicode.fromCodePoint)(i);
    }) : (0, _Unicode.breakWords)(value, parent);
    var length = textList.length;
    var defaultView = node.parentNode ? node.parentNode.ownerDocument.defaultView : null;
    var scrollX = defaultView ? defaultView.pageXOffset : 0;
    var scrollY = defaultView ? defaultView.pageYOffset : 0;
    var textBounds = [];
    var offset = 0;
    for (var i = 0; i < length; i++) {
        var text = textList[i];
        if (parent.style.textDecoration !== _textDecoration.TEXT_DECORATION.NONE || text.trim().length > 0) {
            if (_Feature2.default.SUPPORT_RANGE_BOUNDS) {
                textBounds.push(new TextBounds(text, getRangeBounds(node, offset, text.length, scrollX, scrollY)));
            } else {
                var replacementNode = node.splitText(text.length);
                textBounds.push(new TextBounds(text, getWrapperBounds(node, scrollX, scrollY)));
                node = replacementNode;
            }
        } else if (!_Feature2.default.SUPPORT_RANGE_BOUNDS) {
            node = node.splitText(text.length);
        }
        offset += text.length;
    }
    if (parent.options.fixLigatures && parent.style.fontVariantLigatures !== _fontVariantLigatures.FONT_VARIANT_LIGATURES.NONE) {
        fixLigatures(textBounds);
    }
    return textBounds;
};

var getWrapperBounds = function getWrapperBounds(node, scrollX, scrollY) {
    var wrapper = node.ownerDocument.createElement('html2canvaswrapper');
    wrapper.appendChild(node.cloneNode(true));
    var parentNode = node.parentNode;
    if (parentNode) {
        parentNode.replaceChild(wrapper, node);
        var bounds = (0, _Bounds.parseBounds)(wrapper, scrollX, scrollY);
        if (wrapper.firstChild) {
            parentNode.replaceChild(wrapper.firstChild, wrapper);
        }
        return bounds;
    }
    return new _Bounds.Bounds(0, 0, 0, 0);
};

var getRangeBounds = function getRangeBounds(node, offset, length, scrollX, scrollY) {
    var range = node.ownerDocument.createRange();
    range.setStart(node, offset);
    range.setEnd(node, offset + length);
    return _Bounds.Bounds.fromClientRect(range.getBoundingClientRect(), scrollX, scrollY);
};

var fixLigatures = function fixLigatures(textBounds) {
    var size = textBounds.length;
    var prev = size > 0 ? textBounds[0].bounds : null;
    for (var i = 1; i < size; i++) {
        var bounds = textBounds[i].bounds;
        var next = i + 1 < size ? textBounds[i + 1].bounds : null;
        if (!prev || !bounds.width || !bounds.height || bounds.top !== prev.top || bounds.left !== prev.left) {
            prev = bounds;
            continue;
        }
        if (next && bounds.top === next.top) {
            var ligatures = untilNonLigature(bounds, textBounds, i + 1);
            var ligLen = ligatures.length;
            var nonLig = ligatures[ligLen - 1];
            var nnext = ligatures[ligLen - 2] || next;
            var rightBound = (nonLig ? nonLig.left : nnext.left + nnext.width) - prev.left;
            bounds.left += rightBound / (1 + ligLen);
            if (ligLen > 1) {
                bounds = ligatures[ligLen - 2];
                i += ligLen - 1;
            }
        } else {
            bounds.left += prev.width / 2;
        }
        prev = bounds;
    }
};

var untilNonLigature = function untilNonLigature(ligatureBounds, textBounds, startIndex) {
    var size = textBounds.length;
    var ligatures = [];
    var isFound = false;
    for (var i = startIndex; i < size; i++) {
        var bounds = textBounds[i].bounds;
        if (!bounds.width || !bounds.height || bounds.top > ligatureBounds.top || bounds.left > ligatureBounds.left) {
            isFound = true;
        }
        ligatures.push(bounds);

        if (isFound) {
            break;
        } else if (i === size - 1) {
            ligatures.push(null);
        }
    }
    return ligatures;
};