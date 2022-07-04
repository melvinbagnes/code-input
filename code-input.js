// CodeInput
// by WebCoder49
// Based on a CSS-Tricks Post

var codeInput = {
    usedTemplates: {
    },
    defaultTemplate: undefined,
    templateQueue: {}, // lists of elements for each unrecognised template
    plugins: { // Import a plugin from the plugins folder and it will be saved here.
    },
    Plugin: class {
        /* Runs before code is highlighted; Params: codeInput element) */
        beforeHighlight(codeInput) {}
        /* Runs after code is highlighted; Params: codeInput element) */
        afterHighlight(codeInput) {}
        /* Runs before elements are added into a `code-input`; Params: codeInput element) */
        beforeElementsAdded(codeInput) {}
        /* Runs after elements are added into a `code-input` (useful for adding events to the textarea); Params: codeInput element) */
        afterElementsAdded(codeInput) {}
        /* Runs when an attribute of a `code-input` is changed (you must add the attribute name to observedAttributes); Params: codeInput element, name attribute name, oldValue previous value of attribute, newValue changed value of attribute) */
        attributeChanged(codeInput, name, oldValue, newValue) {}
        observedAttributes = []
    },
    CodeInput: class extends HTMLElement { // Create code input element
        constructor() {
            super(); // Element
        }


        /* Run this event in all plugins with a optional list of arguments */
        plugin_evt(id, args) {
            // Run the event `id` in each plugin
            for (let i in this.template.plugins) {
                let plugin = this.template.plugins[i];
                if (id in plugin) {
                    if(args === undefined) {
                        plugin[id](this);
                    } else {
                        plugin[id](this, ...args);
                    }
                }
            }
        }

        /* Syntax-highlighting functions */
        update(text) {
            if(this.value != text) this.value = text; // Change value attribute if necessary.
            if(this.querySelector("textarea").value != text) this.querySelector("textarea").value = text; 


            let result_element = this.querySelector("pre code");
    
            // Handle final newlines (see article)
            if (text[text.length - 1] == "\n") {
                text += " ";
            }
            // Update code
            result_element.innerHTML = this.escape_html(text);
            this.plugin_evt("beforeHighlight");

            // Syntax Highlight
            if(this.template.includeCodeInputInHighlightFunc) this.template.highlight(result_element, this);
            else this.template.highlight(result_element);
           
            this.plugin_evt("afterHighlight");
        }

        sync_scroll() {
            /* Scroll result to scroll coords of event - sync with textarea */
            let input_element = this.querySelector("textarea");
            let result_element = this.template.preElementStyled ? this.querySelector("pre") : this.querySelector("pre code");
            // Get and set x and y
            result_element.scrollTop = input_element.scrollTop;
            result_element.scrollLeft = input_element.scrollLeft;
        }

        escape_html(text) {
            return text.replace(new RegExp("&", "g"), "&amp;").replace(new RegExp("<", "g"), "&lt;"); /* Global RegExp */
        }

        /* Get the template for this element or add to the unrecognised template queue. */
        get_template() {
            // Get name of template
            let template_name;
            if(this.getAttribute("template") == undefined) {
                // Default
                template_name = codeInput.defaultTemplate;
            } else {
                template_name = this.getAttribute("template");
            }
            // Get template
            if(template_name in codeInput.usedTemplates) {
                return codeInput.usedTemplates[template_name];
            } else {
                // Doesn't exist - add to queue
                if( !(template_name in codeInput.templateQueue)) {
                    codeInput.templateQueue[template_name] = [];
                }
                codeInput.templateQueue[template_name].push(this);
                return undefined;
            }
            codeInput.usedTemplates[codeInput.defaultTemplate]
        }
        /* Set up element when a template is added */
        setup() {
            this.classList.add("code-input_registered"); // Remove register message
            if(this.template.preElementStyled) this.classList.add("code-input_pre-element-styled");

            this.plugin_evt("beforeElementsAdded");

            /* Defaults */
            let lang = this.getAttribute("lang");
            let placeholder = this.getAttribute("placeholder") || this.getAttribute("lang") || "";
            let value = this.value || this.innerHTML || "";
    
            this.innerHTML = ""; // Clear Content
    
            /* Create Textarea */
            let textarea = document.createElement("textarea");
            textarea.placeholder = placeholder;
            textarea.value = value;
            textarea.setAttribute("spellcheck", "false");
    
            if (this.getAttribute("name")) {
                textarea.setAttribute("name", this.getAttribute("name")); // for use in forms
                this.removeAttribute("name");
            }
    
            textarea.setAttribute("oninput", "this.parentElement.update(this.value); this.parentElement.sync_scroll();");
            textarea.setAttribute("onscroll", "this.parentElement.sync_scroll();");
            this.append(textarea);

            /* Create pre code */
            let code = document.createElement("code");
            let pre = document.createElement("pre");
            pre.setAttribute("aria-hidden", "true"); // Hide for screen readers
            pre.append(code);
            this.append(pre);

            if(this.template.isCode) {
                if(lang != undefined && lang != "") {
                    code.classList.add("language-" + lang);
                }
            }
            
            this.plugin_evt("afterElementsAdded");

            /* Add code from value attribute - useful for loading from backend */
            this.update(value, this);
        }
        
        /* Callbacks */
        connectedCallback() {
            // Added to document
            this.template = this.get_template();
            if(this.template != undefined) this.setup();
        }
        get observedAttributes() {
            let attrs =  ["value", "placeholder", "lang", "template"]; // Attributes to monitor
            
            /* Add from plugins */
            for (let plugin in this.template.plugins) {
                attrs = attrs.concat(plugin.observedAttributes);
            }
            return attrs;
        }
        
        attributeChangedCallback(name, oldValue, newValue) {
            if(this.isConnected) {
                // This will sometimes be called before the element has been created, so trying to update an attribute causes an error.
                // Thanks to Kevin Loughead for pointing this out.
                switch (name) {
    
                    case "value":
    
                        // Update code
                        this.update(newValue);
        
                        break;
        
                    case "placeholder":
                        this.querySelector("textarea").placeholder = newValue;
                        break;
                    case "template":
                        this.template = codeInput.usedTemplates[newValue || codeInput.defaultTemplate];
                        if(this.template.preElementStyled) this.classList.add("code-input_pre-element-styled");
                        else this.classList.remove("code-input_pre-element-styled");
                        // Syntax Highlight
                        this.update(this.value);
    
                    case "lang":
                        let code = this.querySelector("pre code");
                        let textarea = this.querySelector("textarea");
                        
                        // Case insensitive
                        oldValue = oldValue.toLowerCase();
                        newValue = newValue.toLowerCase();
    
                        // Remove old language class and add new
                        console.log("REMOVE", "language-" + oldValue);
                        code.classList.remove("language-" + oldValue); // From CODE
                        code.parentElement.classList.remove("language-" + oldValue); // From PRE
                        code.classList.remove("language-none"); // Prism
                        code.parentElement.classList.remove("language-none"); // Prism
                        
                        if(newValue != undefined && newValue != "") {
                            code.classList.add("language-" + newValue);
                            console.log("ADD", "language-" + newValue);
                        }
                        
                        if(textarea.placeholder == oldValue) textarea.placeholder = newValue;
    
                        this.update(this.value);
                    
                    default:
                        this.plugin_evt("attributeChanged", [name, oldValue, newValue]); // Plugin event
                }
            }
            
        }

        /* Value attribute */
        get value() {
            return this.getAttribute("value");
        }
        set value(val) {
            return this.setAttribute("value", val);
        }
        /* Placeholder attribute */
        get placeholder() {
            return this.getAttribute("placeholder");
        }
        set placeholder(val) {
            return this.setAttribute("placeholder", val);
        }
    },
    registerTemplate: function(template_name, template) {
        // Set default class
        codeInput.usedTemplates[template_name] = template;
        // Add elements w/ template from queue
        if(template_name in codeInput.templateQueue) {
            for(let i in codeInput.templateQueue[template_name]) {
                elem = codeInput.templateQueue[template_name][i];
                elem.template = template;
                elem.setup();
            }
        }
        if(codeInput.defaultTemplate == undefined) {
            codeInput.defaultTemplate = template_name;
            // Add elements w/ default template from queue
            if(undefined in codeInput.templateQueue) {
                for(let i in codeInput.templateQueue[undefined]) {
                    elem = codeInput.templateQueue[undefined][i];
                    elem.template = template;
                    elem.setup();
                }
            }
        }
    },
    templates: {
        custom(highlight=function() {}, preElementStyled=true, isCode=true, includeCodeInputInHighlightFunc=false, plugins=[]) {
            return {
                highlight: highlight, 
                includeCodeInputInHighlightFunc: includeCodeInputInHighlightFunc,
                preElementStyled: preElementStyled,
                isCode: isCode,
            };
        },
        prism(prism, plugins=[]) { // Dependency: Prism.js (https://prismjs.com/)
            return {
                includeCodeInputInHighlightFunc: false,
                highlight: prism.highlightElement, 
                preElementStyled: true,
                isCode: true,
                plugins: plugins,
            };
        },
        hljs(hljs, plugins=[]) { // Dependency: Highlight.js (https://highlightjs.org/)
            return {
                includeCodeInputInHighlightFunc: false,
                highlight: hljs.highlightElement, 
                preElementStyled: false,
                isCode: true,
                plugins: plugins,
            };
        },
        characterLimit() {
            return {
                highlight: function(result_element, code_input) {

                    let character_limit = Number(code_input.getAttribute("data-character-limit"));

                    let normal_characters = code_input.escape_html(code_input.value.slice(0, character_limit));
                    let overflow_characters = code_input.escape_html(code_input.value.slice(character_limit));
                    
                    result_element.innerHTML = `${normal_characters}<mark class="overflow">${overflow_characters}</mark>`;
                    if(overflow_characters.length > 0) {
                        result_element.innerHTML += ` <mark class="overflow-msg">${code_input.getAttribute("data-overflow-msg") || "(Character limit reached)"}</mark>`;
                    }
                },
                includeCodeInputInHighlightFunc: true,
                preElementStyled: true,
                isCode: false
            }
        },
        rainbowText(rainbow_colors=["red", "orangered", "orange", "goldenrod", "gold", "green", "darkgreen", "navy", "blue",  "magenta"], delimiter="") {
            return {
                highlight: function(result_element, code_input) {
                    let html_result = [];
                    let sections = code_input.value.split(code_input.template.delimiter);
                    for (let i = 0; i < sections.length; i++) {
                        html_result.push(`<span style="color: ${code_input.template.rainbow_colors[i % code_input.template.rainbow_colors.length]}">${code_input.escape_html(sections[i])}</span>`);
                    }
                    result_element.innerHTML = html_result.join(code_input.template.delimiter);
                },
                includeCodeInputInHighlightFunc: true,
                preElementStyled: true,
                isCode: false,
                rainbow_colors: rainbow_colors,
                delimiter: delimiter
            }
        }
    }
}

customElements.define("code-input", codeInput.CodeInput); // Set tag