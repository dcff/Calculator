const elements = {
    // display: document.querySelector('.display'),
    display: document.querySelector('.display-content'),
    fullCalc: document.querySelector('.full_calc'),
    buttons: document.querySelectorAll('.button'),
    buttonAC: document.querySelector('#reset'),
};

const widthView = 19;

class Calculation {

    constructor() {
        this.inputString = "0";
        this.initializeListeners();
    }

    add(x, y) {
        return x + y;
    }

    subtract(x, y) {
        return x - y;
    }

    multiply(x, y) {
        return x * y;
    }

    divide(x, y) {

        if (y === 0) {
            return "∞";
        } else {
            return x / y;
        }
    }


    initializeListeners() {
        elements.buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.updateString(button.innerText);
                elements.display.innerText = this.inputString;
            });
        });
    }


    updateString(input) {
        const operands = ["+", "-", "÷", "*", ".", "%"];
        const lastChar = this.inputString.charAt(this.inputString.length - 1);

        //clean up the previous result if it includes exponential
        if (this.inputString.includes("e")) {
            this.inputString = "0";
        }

        // reset the input
        if (input === "AC") {
            this.reset();
            return;
        }

        // ignore the logo
        if (input === "❅") {
            return;
        }

        if (input === "⌫") {
            if (this.inputString.endsWith(")")) {
                const negNumLength = this.findNumToFlipToPos();
                this.removeBrackets(negNumLength);
                return;
            } else {
                this.inputString = this.inputString.slice(0, -1);
                if (!this.inputString.length || this.inputString === "0") {
                    this.reset();
                    this.toggleACButton("on");
                }
                return;
            }
        }

        if (input === "=") {
            if (operands.slice(0, -1).includes(lastChar) || !/[+\-÷*%]/.test(this.inputString)) {
                return;
            } else {
                this.calculate();
                this.toggleACButton("on");
                return;
            }
        } else {
            this.toggleACButton("off");
        }

        const invalidConditions = [
            // Another operand cannot follow [+ - ÷ * .]
            () => operands.slice(0, -1).includes(lastChar) && operands.includes(input),

            // Numbers and [% . ] cannot follow [%]
            () => lastChar === "%" && /[0-9.%]/.test(input),

            // Numbers and [. %] cannot follow ")"
            () => lastChar === ")" && /[0-9.%]/.test(input),

            // Ignore initial "0" conditions
            () => this.inputString === "0" && (input === "0" || input === "+/-"),

            // Cannot flip the sign after "."
            () => lastChar === "." && input === "+÷-"
        ];

        // If any invalid condition is true, return early
        if (invalidConditions.some(condition => condition())) {
            return;
        }

        // Reset inputString if starting with "0" and input is a number
        if (this.inputString === "0" && /[1-9]/.test(input)) {
            this.inputString = "";
        }

        // Remove "0" after an operand if input is a number
        if (this.inputString.endsWith("0")
            && operands.slice(0, -2).includes(this.inputString.charAt(this.inputString.length - 2))
            && /[0-9]/.test(input)) {
            console.log("here");
            this.inputString = this.inputString.slice(0, -1);
        }

        // flip the sign
        if (input === "+/-") {
            if (lastChar === ")") {
                const negNumLength = this.findNumToFlipToPos();
                this.removeBrackets(negNumLength);
            } else {
                const numLength = this.findNumToFlipToNeg();
                this.addBrackets(numLength);
            }

            return;
        }

        this.inputString += input;

    }

    findNumToFlipToNeg() {
        for (let i = 1; i <= this.inputString.length; i++) {
            const char = this.inputString.charAt(this.inputString.length - i);
            if (!/\d|\.|%/.test(char)) {
                return i - 1;
            }
        }

        return this.inputString.length;
    }

    findNumToFlipToPos() {
        for (let i = 2; i <= this.inputString.length; i++) {
            const char = this.inputString.charAt(this.inputString.length - i);
            if (char === "-") {
                return i - 2;
            }
        }

        return this.inputString.length;
    }

    addBrackets(numLength) {
        if (numLength) {
            this.inputString = this.inputString.slice(0, -numLength) + "(-" + this.inputString.slice(-numLength) + ")";
        }
    }

    removeBrackets(numLength) {
        this.inputString = this.inputString.slice(0, -(numLength + 3)) + this.inputString.slice(-(numLength + 1), -1);
    }

    calculate() {
        const groups = this.parseGroups();
        const cleanGroups = this.cleanBrackets(groups);
        const percRemoved = this.calcPercent(cleanGroups);

        const longResult = this.sumFromLeftToRight(percRemoved);

        const result = this.cleanResult(longResult);
        //elements.fullCalc.innerText = "11111111122222+23+34+45+56+67+78+89+90.01";
        elements.fullCalc.innerText = this.inputString;

        this.inputString = (result < 0) ? "(" + result.toString() + ")" : result.toString();
    }

    //needs to truncate long results
    cleanResult(result) {
        if (result.toString().includes("∞")) {
            return "∞";
        } else if (result.toString().includes("e")) {
            return this.shortenExp(result);
        } else if (result.toString().length > widthView) {
            result = this.shortenExp(result.toExponetial());
        }
        return result;
    }

    shortenExp(result) {
        // Convert to string only once
        const resString = result.toString();

        // Early return if string is short enough
        if (resString.length <= widthView) {
            return result;
        }

        // Find the position of 'e' (for scientific notation)
        const eIndex = resString.indexOf('e');

        // If no 'e' is found, we need different handling
        if (eIndex === -1) {
            // If no scientific notation, return original result
            // You might want to add additional handling here
            return result;
        }

        // Split into head and tail parts
        const tail = resString.substring(eIndex);
        const headLength = widthView - tail.length;

        // Check if we have space for any meaningful head part
        if (headLength <= 0) {
            return "0";
        }

        // Format the head with appropriate precision
        // Subtract 2 to account for potential "0." prefix
        const precision = Math.max(1, headLength - 4);
        const head = parseFloat(resString.substring(0, eIndex)).toPrecision(precision);

        return head + tail;
    }

    parseGroups() {
        return this.inputString.match(/[0-9.%]+|[*\-+%÷]|\(+[-]+[0-9.%]+\)/g);
    }

    cleanBrackets(groups) {
        return groups.map(item => {
            if (item.startsWith("(")) {
                return "-" + item.slice(2, -1);
            }
            return item;
        })
    }

    calcPercent(groups) {
        return groups.map((item, index) => {
            // Check if the item is a percentage
            if (typeof item === 'string' && item.endsWith('%')) {
                // Check if it's the first item or follows a multiplication/division operator
                // console.log(index);
                if (index === 0 || ["÷", "*"].includes(groups[index - 1])
                    || groups[index - 2].endsWith('%') && ((index > 2)
                        && (!["÷", "*"].includes(groups[index - 3])))) {
                    return parseFloat(item.slice(0, -1)) / 100;
                }
                return item;
            }

            // Check if the item can be parsed as a number
            const num = parseFloat(item);
            return isNaN(num) ? item : num;
        });
    }

    sumFromLeftToRight(groups) {
        let result = 0;

        for (let i = 1; i < groups.length; i += 2) {
            //console.log(`i=${i}`);
            const op = groups[i];
            if (["÷", "*"].includes(op)) {
                const x = groups[i - 1];
                const y = typeof groups[i + 1] === "string" ? parseFloat(groups[i + 1].slice(0, -1)) : groups[i + 1];
                result = this.handleCalc(op, x, y);
                //console.log(`result = ${result}`);
                groups[i - 1] = "empty";
                groups[i] = "empty"
                groups[i + 1] = result;
            }
        }

        const newGroups = groups.filter(item => {
            if (item !== "empty") {
                return item;
            }
        })

        //console.log(newGroups);

        if (newGroups.includes("÷") || newGroups.includes("*")) {
            this.sumFromLeftToRight(newGroups);
        } else {
            if (newGroups.length >= 3) {
                const op = newGroups[1];
                const x = newGroups[0];
                const y = typeof newGroups[2] === "string" ? (parseFloat(newGroups[2].slice(0, -1)) * x / 100) : newGroups[2];
                result = this.handleCalc(op, x, y);
                //console.log(`x=${x}, y=${y}`)
                //console.log(`result = ${result}`);

                newGroups[2] = result;
                this.sumFromLeftToRight(newGroups.slice(2, newGroups.length));
            }
        }

        return result;
    }

    handleCalc(op, x, y) {
        switch (op) {
            case "+":
                return this.add(x, y);
            case "-":
                return this.subtract(x, y);
            case "*":
                return this.multiply(x, y);
            case "÷":
                // can return "∞"
                return this.divide(x, y);
            default:
                return 0;
        }

    }

    reset() {
        this.inputString = "0";
        elements.fullCalc.innerText = "";
    }

    toggleACButton(state) {
        state === "on" ? elements.buttonAC.innerText = "AC" : elements.buttonAC.innerText = "⌫";
        state === "on" ? elements.buttonAC.title = "AC" : elements.buttonAC.title = "⌫";
    }

}

const session = new Calculation();