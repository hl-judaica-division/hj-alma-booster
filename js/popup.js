// Globals
let get_cat = false;
let key = null;

// -----------------------------------------------------------------------------------------------
$(function() {
    // many holdings
    // send_active_message({"greeting": "edit_holding_record", "mms": '990075360980203941', 'holding': '222013462800003941'});

    // one holdings
    // send_active_message({"greeting": "edit_holding_record", "mms": '99153750688503941', 'holding': '222291116100003941'});

    // load in settings from chrome.storage
    chrome.storage.sync.get(["user_type", "page", "alma_invoice", "linking_defaults", "name", "library_unit", "library_unit_previous", "stats_type", "stats_focus", "cat_toggle", "cat_value", "api_key"], function(items) {
        // if they haven't used the extension before the immediately show lockscreen
        if (items.user_type === undefined || items.user_type === 3) {
            window.location.href = "../html/lockscreen.html";
        }

        // scroll to the correct page
        if (items.page) {
            $("#pane_carousel").carousel(items.page);
        }

        if (items.alma_invoice) {
            document.getElementById("invoice_vendor").value = items.alma_invoice["vendor"];
            document.getElementById("invoice_number").value = items.alma_invoice["number"];
        }
        if (items.linking_defaults) {
            document.getElementById("linking_defaults_MMSID").value = items.linking_defaults.MMSID;
            document.getElementById("linking_defaults_title").value = items.linking_defaults.title;
            document.getElementById("linking_defaults_type").value = items.linking_defaults.type;
            document.getElementById("linking_defaults_barcode").value = items.linking_defaults.barcode;

            const index = document.getElementById("linking_defaults_type").selectedIndex;
            if (document.getElementById("linking_defaults_type").options[index]) {
                document.getElementById("linking_item_callnum").value = document.getElementById("linking_defaults_type").options[index].getAttribute("data-call-num-prefix");
            }
        }

        // add custom unit list to dropdown or lock in case somehow no unit list exists
        if (items.library_unit) {
            const drops = [document.getElementById("stats_unit"), document.getElementById("api_stats_unit")];
            for (let j = 0; j < drops.length; j++) {
                for (let i = 0; i < items.library_unit.length; i++) {
                    const new_opt = document.createElement("option");
                    new_opt.value = items.library_unit[i].code;
                    new_opt.innerText = items.library_unit[i].name;
                    drops[j].add(new_opt);
                }
            }
        } else {
            chrome.storage.sync.set({
                "user_type": undefined,
            }, function() {
                window.location.href = "../html/lockscreen.html";
            });
        }

        // remember previous chosen unit
        if (items.library_unit_previous) {
            document.getElementById("stats_unit").selectedIndex = items.library_unit_previous;
            document.getElementById("api_stats_unit").selectedIndex = items.library_unit_previous;
        } else {
            document.getElementById("stats_unit").selectedIndex = 0;
            document.getElementById("api_stats_unit").selectedIndex = 0;
        }
        document.getElementById("stats_string_unit").innerText = "$$e" + document.getElementById("stats_unit").value;
        $("#stats_unit").trigger("change");
        document.getElementById("api_stats_string_unit").innerText = "$$e" + document.getElementById("api_stats_unit").value;
        $("#api_stats_unit").trigger("change");

        if (items.stats_type) {
            const options = document.querySelectorAll(".btn-stats [value='" + items.stats_type + "']");
            for (let i = 0; i < options.length; i++) {
                options[i].checked = true;
                options[i].parentElement.classList.add("active");
            }
        }
        if (items.stats_focus) {
            document.querySelector(".pane-link-action[data-focus-box='#stats_note']").setAttribute("data-focus-box", items.stats_focus);
            const focuser = document.querySelector(items.stats_focus);
            if (focuser) {
                focuser.focus();
            }
        }
        if (items.cat_toggle) {
            if (items.cat_toggle === "auto") {
                get_cat = true;
            } else {
                get_cat = false;
            }
        }
        stats_prep(get_cat);

        if (items.cat_value) {
            document.getElementById("stats_cataloguer").value = items.cat_value;
            check_stats_input("stats_cataloguer", "stats_string_cataloguer", "f");

            document.getElementById("api_stats_cataloguer").value = items.cat_value;
            check_stats_input("api_stats_cataloguer", "api_stats_string_cataloguer", "f");
        }

        // make key available globally
        if (items.api_key) {
            key = items.api_key;
        }
    });

    // add clipboard copier for statistics
    const macro_clip = new ClipboardJS('#stats_macro_copy', {
        text: function() {
            const stats = document.getElementById("stats_string").innerText.substr(5);
            const required = ["$$a", "$$d", "$$e", "$$f"];
            for (let i = 0; i < required.length; i++) {
                if (stats.indexOf(required[i]) < 0) {
                    console.log(required[i]);
                    create_alert_in_element(document.getElementById("stats_error"), "Please fill out all fields (note optional)");
                    return false;
                }
            }
            // copy the data with marker for Macro Express
            return "ALMA_STATISTICS|" + stats;
        },
    });
    macro_clip.on("success", function(e) {
        chrome.storage.sync.set({
            "cat_value": document.getElementById("stats_cataloguer").value,
        });
        document.getElementById("stats_macro_copy").innerText = "Copied!";
        window.close();
        setTimeout(function() {
            document.getElementById("stats_macro_copy").innerText = "Macro Copy";
        }, 1000);
    });

    // stop carousel from spinning and set first tab active
    $("#pane_carousel").carousel({
        interval: false,
        keyboard: false,
    });

    // my easier way of quick-adding enter events to trigger certain buttons automatically from html
    const enters = document.querySelectorAll("[data-enter-target]");
    for (let i = 0; i < enters.length; i++) {
        enters[i].addEventListener("keydown", function(e) {
            if (e.keyCode == 13) {
                document.getElementById(this.getAttribute("data-enter-target")).click();
            }
        });
    }
    const enter_tabs = document.querySelectorAll("[data-enter-tab]");
    for (let i = 0; i < enter_tabs.length; i++) {
        enter_tabs[i].addEventListener("keydown", function(e) {
            if (e.keyCode == 13) {
                document.getElementById(this.getAttribute("data-enter-tab")).focus();
            }
        });
    }

    // create links to tab switching
    const pane_links = document.getElementsByClassName("pane-link");
    let counter = 1;
    let subcounter = 1;
    let link_counter = 0;
    for (let i = 0; i < pane_links.length; i++) {
        let numbering = "";
        if (pane_links[i].classList.contains("pane-2")) {
            if (subcounter == 1) {
                counter--;
            }
            numbering = counter.toString() + "." + subcounter.toString() + " ";
            subcounter++;
        } else {
            if (subcounter !== 1) {
                counter++;
                subcounter = 1;
            }
            numbering = counter.toString() + ". ";
            counter++;
        }
        pane_links[i].innerText = numbering + pane_links[i].innerText;
        if (pane_links[i].classList.contains("pane-link-action")) {
            pane_links[i].setAttribute("data-link-counter", link_counter);
            pane_links[i].addEventListener("click", function() {
                $("#pane_carousel").carousel(parseInt(this.getAttribute("data-link-counter")));
            });
            link_counter++;
        } else {
            pane_links[i].addEventListener("click", function() {
                this.nextElementSibling.click();
            });
        }
    }

    // arrow key transition
    document.addEventListener("keydown", function(e) {
        if (e.keyCode == 38 && e.ctrlKey) {
            $("#pane_carousel").carousel("prev");
        } else if (e.keyCode == 40 && e.ctrlKey) {
            $("#pane_carousel").carousel("next");
        }
    });

    // change active menu item in nav
    $("#pane_carousel").on("slid.bs.carousel", function(e) {
        $(".pane-link").removeClass("active");
        const action = document.getElementsByClassName("pane-link-action")[e.to];
        action.classList.add("active");
        action.parentElement.children[0].classList.add("active");

        const focus_id = action.getAttribute("data-focus-box");
        if (focus_id) {
            if (document.querySelector(focus_id)) {
                document.querySelector(focus_id).focus();
            }
        }

        // special case
        if (action.innerText === "1. Statistics") {
            stats_prep(get_cat);
        }

        chrome.storage.sync.set({
            "page": e.to,
        });
    });

    // pane movement with numbers
    document.body.addEventListener("keydown", function(e) {
        if (e.keyCode >= 49 && e.keyCode < 58 && e.ctrlKey && !e.shiftKey) {
            const link = document.getElementsByClassName("pane-1")[e.keyCode - 49];
            if (link) {
                link.click();
            }
        } else if (e.keyCode >= 49 && e.keyCode < 58 && e.ctrlKey && e.shiftKey) {
            const pane_header = document.getElementsByClassName("pane-1 active")[0];
            const link = pane_header.parentElement.getElementsByClassName("pane-2")[e.keyCode - 49];
            if (link) {
                link.click();
            }
        }
    });

    document.getElementById("close").addEventListener("click", function() {
        window.close();
    });

    document.getElementById("help").addEventListener("click", function() {
        chrome.tabs.create({
            "url": "../html/help.html",
        });
    });

    document.getElementById("options").addEventListener("click", function() {
        chrome.tabs.create({
            "url": "../html/options.html",
        });
    });

    // often need today's date so any with this class get it
    const todays = document.getElementsByClassName("today");
    const date = today();
    for (let i = 0; i < todays.length; i++) {
        todays[i].innerText = date;
    }

    const invoice_btns = document.getElementsByClassName("btn-alma-invoice");
    for (let i = 0; i < invoice_btns.length; i++) {
        invoice_btns[i].addEventListener("click", function() {
            invoice_action(this.id);
        });
    }

    document.getElementById("linking_defaults_barcode").addEventListener("keyup", function() {
        if (this.value.length == 14) {
            document.getElementById("linking_defaults_MMSID").select();
        }
    });
    document.getElementById("linking_defaults_type").addEventListener("change", function() {
        document.getElementById("linking_item_callnum").value = this.options[this.selectedIndex].getAttribute("data-call-num-prefix");
    });
    document.getElementById("linking_set_defaults").addEventListener("click", function() {
        const linking_defaults = {
            "MMSID": document.getElementById("linking_defaults_MMSID").value,
            "barcode": document.getElementById("linking_defaults_barcode").value,
            "type": document.getElementById("linking_defaults_type").value,
            "title": "",
        };
        send_active_message({
            "greeting": "linking_set_defaults",
            "defaults": linking_defaults,
        }, function(response) {
            window.close();
        });
    });
    document.getElementById("linking_link_item").addEventListener("click", function() {
        linking_check_holdings(document.getElementById("linking_item_MMSID").value, {
            "MMSID": document.getElementById("linking_defaults_MMSID").value,
            "barcode": document.getElementById("linking_defaults_barcode").value,
            "title": document.getElementById("linking_defaults_title").value,
            "type": document.getElementById("linking_defaults_type").value,
        });
    });
    document.getElementById("linking_link_item_callnum").addEventListener("click", function() {
        send_active_message({
            'greeting': 'linking_get_mms',
            'callnum': document.getElementById("linking_item_callnum").value
        }, function(response) {
            document.getElementById("linking_item_MMSID").value = response.mms;
            document.getElementById("linking_link_item").click();
        });
    });
    document.getElementById("linking_another").addEventListener("click", function() {
        window.location.reload();
    });
    document.getElementById("linking_check").addEventListener("click", function() {
        send_active_message({
            "greeting": "linking_check",
            "barcode": document.getElementById("linking_check_barcode").value,
        }, function(response) {
            window.close();
        });
    });
    document.getElementById("linking_clear_defaults").addEventListener("click", function() {
        $(".linking-default").val("");
        const linking_defaults = {
            "MMSID": "",
            "barcode": "",
            "type": "",
            "title": "",
        };
        chrome.storage.sync.set({
            "linking_defaults": linking_defaults,
        });
    });

    document.getElementById("api_stats_bib_go").addEventListener("click", function() {
        api_bib_go("api_stats");
    });
    document.getElementById("api_stats_go").addEventListener("click", function() {
        api_stats_go();
    });

    document.getElementById("api_stats_unit").addEventListener("change", function() {
        document.getElementById("api_stats_string_unit").innerText = "$$e" + this.value;
        chrome.storage.sync.set({
            "library_unit_previous": this.selectedIndex,
        });
    });
    document.getElementById("api_stats_note").addEventListener("keyup", function() {
        check_stats_input("api_stats_note", "api_stats_string_note", "x");
    });
    document.getElementById("api_stats_cataloguer").addEventListener("keyup", function() {
        check_stats_input("api_stats_cataloguer", "api_stats_string_cataloguer", "f");
    });

    const api_observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            const list = mutation.target.classList;
            if (mutation.attributeName === "class" && list.contains("active")) {
                const val = mutation.target.querySelector("input").value;
                document.getElementById("api_stats_string_type").innerText = "$$a" + val;
                chrome.storage.sync.set({
                    "stats_type": val,
                });
            }
        });
    });
    const api_radio_config = {
        attributes: true,
    };

    const api_stats_radios = document.querySelectorAll("#api_stats_type .btn-stats");
    for (let i = 0; i < api_stats_radios.length; i++) {
        api_observer.observe(api_stats_radios[i], api_radio_config);
    }

    document.getElementById("stats_unit").addEventListener("change", function() {
        document.getElementById("stats_string_unit").innerText = "$$e" + this.value;
        chrome.storage.sync.set({
            "library_unit_previous": this.selectedIndex,
        });
    });
    document.getElementById("stats_note").addEventListener("keyup", function() {
        check_stats_input("stats_note", "stats_string_note", "x");
    });
    document.getElementById("stats_cataloguer").addEventListener("keyup", function() {
        check_stats_input("stats_cataloguer", "stats_string_cataloguer", "f");
    });

    const radioObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            const list = mutation.target.classList;
            if (mutation.attributeName === "class" && list.contains("active")) {
                const val = mutation.target.querySelector("input").value;
                document.getElementById("stats_string_type").innerText = "$$a" + val;
                chrome.storage.sync.set({
                    "stats_type": val,
                });
            }
        });
    });
    const radio_config = {
        attributes: true,
    };

    const stats_radios = document.querySelectorAll("#stats_type .btn-stats");
    for (let i = 0; i < stats_radios.length; i++) {
        radioObserver.observe(stats_radios[i], radio_config);
    }

    document.getElementById("periodicals_month").addEventListener("click", function() {
        this.classList.toggle("active");
        document.getElementById("periodicals_month_no").classList.toggle("hide");
        document.getElementById("periodicals_month_yes").classList.toggle("hide");
    });

    document.getElementById("periodicals_callnum_search").addEventListener("click", function() {
        document.getElementById("periodicals_callnum").value = add_periodicals_prefix(document.getElementById("periodicals_callnum").value);
        send_active_message({
            "greeting": "periodicals_set_mmsid",
            "callnum": document.getElementById("periodicals_callnum").value,
        }, function(response) {
            console.log(response);
            document.getElementById("periodicals_chroni").value = document.getElementById("periodicals_chroni_prep").value;
            document.getElementById("periodicals_enuma").value = document.getElementById("periodicals_enuma_prep").value;
            document.getElementById("periodicals_enumb").value = document.getElementById("periodicals_enumb_prep").value;
            let descs = construct_periodicals_description()
            document.getElementById("periodicals_subfield_desc").value = descs[0];
            document.getElementById("periodicals_desc").value = descs[1];
            setTimeout(function() {
                api_bib_go("periodicals", response.mms_id);
            }, 2000);
        });
    });
    document.getElementById("periodicals_go").addEventListener("click", function() {
        periodicals_record();
    });
    $("#periodicals_enuma, #periodicals_enumb, #periodicals_chroni").on("keyup", function() {
        let descs = construct_periodicals_description()
            document.getElementById("periodicals_subfield_desc").value = descs[0];
            document.getElementById("periodicals_desc").value = descs[1];
    });
});

// ------------------------------------------------------------------------------------------------
// Helper Functions

/**
 * Collect invoice data for performing an invoice action (in content script)
 * @param  {[string]} action action name
 */
function invoice_action(action) {
    invoice_data = {
        "vendor": document.getElementById("invoice_vendor").value.toUpperCase(),
        "number": document.getElementById("invoice_number").value,
    };
    if (invoice_data.vendor !== "" && invoice_data.number !== "") {
        send_active_message({
            "greeting": action,
            "data": invoice_data,
        }, function(response) {
            if (action !== "invoice_check") {
                invoice_data.number = "";
            }
            chrome.storage.sync.set({
                "alma_invoice": invoice_data,
            });
            window.close();
        });
    } else {
        create_alert_in_element(document.getElementById("invoice_error"), "You must supply a vendor and invoice number");
    }
}

function linking_check_holdings(MMSID, defaults) {
    $("#linking_input").fadeOut(function() {
        $("#linking_holdinglist").fadeIn();
    });

    let holdingurl = construct_api_url("retrieve_holding_list", MMSID);
    $.get(holdingurl, function(holding_list, status) {
        if (status != "success") {
            console.log("API error", holding_list);
            document.getElementById("linking_holdings_loading").innerHTML = "API Error - See Console";
            return;
        } else {
            document.getElementById("linking_holdings_loading").classList.add("hide");
        }
        let holdings = holding_list.querySelectorAll("holding");
        display_holdings_list("linking_holdings", holdings, function() {
            link_item(MMSID, this.querySelector("small").innerText, defaults);
        });
    });
}

/**
 * Link an item to a box
 * @param  {[type]} MMSID    item mms_id
 * @param  {[type]} callnum  item call number
 * @param  {[type]} defaults defaults (box details)
 * @param  {[type]} lookup   whether to look up the details
 */
function link_item(MMSID, holding_id, defaults) {
    // test case: 990133438410203941
    $("#linking_holdinglist").fadeOut(function() {
        $("#linking_statuspage").fadeIn();
    });

    // retrieve bibliographic record of item
    let biburl = construct_api_url("retrieve_bib", MMSID)
    $.get(biburl, function(bib, status) {
        if (status == "success") {
            document.querySelector("#linking_getbib .text-worked").classList.remove("hide");
            document.querySelector('#linking_pbar').style.width = "25%";
            document.querySelector('#linking_progress_text').innerText = "Updating bibliographic record";
        } else {
            document.querySelector("#linking_getbib .text-danger").classList.remove("hide");
        }

        // create new 929 field with box mms
        let boxMMS929 = document.createElement("datafield");
        boxMMS929.setAttribute("ind1", " ");
        boxMMS929.setAttribute("ind2", "0");
        boxMMS929.setAttribute("tag", "929");

        let boxMMSsub = document.createElement("subfield");
        boxMMSsub.setAttribute("code", "a");
        boxMMSsub.innerText = "Linked Judaica : " + defaults.type + " : " + defaults.MMSID;

        boxMMS929.appendChild(boxMMSsub);

        // create another 929 field with box barcode
        let barcode929 = document.createElement("datafield");
        barcode929.setAttribute("ind1", " ");
        barcode929.setAttribute("ind2", "0");
        barcode929.setAttribute("tag", "929");

        let barcodesub = document.createElement("subfield");
        barcodesub.setAttribute("code", "a");
        barcodesub.innerText = "Linked Judaica Barcode : " + defaults.barcode;

        barcode929.appendChild(barcodesub);

        bib.querySelector("record").appendChild(boxMMS929);
        bib.querySelector("record").appendChild(barcode929);
        console.log("New", bib);

        // format the new bib for an http request and update it using the api
        const new_bib_string = new XMLSerializer().serializeToString(bib.documentElement);
        $.ajax({
            url: biburl,
            method: "PUT",
            contentType: "application/xml",
            data: new_bib_string,
            success: function(data, status) {
                console.log(data, status);
                document.querySelector("#linking_setbib .text-worked").classList.remove("hide");
                document.querySelector('#linking_pbar').style.width = "50%";
                document.querySelector('#linking_progress_text').innerText = "Retrieving holding record";

                // now retreive the holding record associated with bib (should be just one)
                let holdingurl = construct_api_url("retrieve_holding", MMSID, holding_id);
                $.get(holdingurl, function(holding, status) {
                    if (status == "success") {
                        document.querySelector("#linking_getholding .text-worked").classList.remove("hide");
                        document.querySelector('#linking_pbar').style.width = "75%";
                        document.querySelector('#linking_progress_text').innerText = "Updating holding record";
                    } else {
                        document.querySelector("#linking_getholding .text-danger").classList.remove("hide");
                    }
                    console.log("Holding record", holding);

                    // create a new 977 field with box info
                    let box977 = document.createElement("datafield");
                    box977.setAttribute("ind1", "9");
                    box977.setAttribute("ind2", " ");
                    box977.setAttribute("tag", "977");

                    let box977title = document.createElement("subfield");
                    box977title.setAttribute("code", "t");
                    box977title.innerText = defaults.title;
                    box977.appendChild(box977title);

                    let box977id = document.createElement("subfield");
                    box977id.setAttribute("code", "f");
                    box977id.innerText = defaults.MMSID;
                    box977.appendChild(box977id);

                    let box977type = document.createElement("subfield");
                    box977type.setAttribute("code", "w");
                    box977type.innerText = defaults.type;
                    box977.appendChild(box977type);

                    holding.querySelector("record").appendChild(box977);
                    const new_holding_string = new XMLSerializer().serializeToString(holding.documentElement);
                    $.ajax({
                        url: holdingurl,
                        method: "PUT",
                        contentType: "application/xml",
                        data: new_holding_string,
                        success: function(data, status) {
                            document.querySelector("#linking_setholding .text-worked").classList.remove("hide");
                            document.querySelector('#linking_pbar').style.width = "100%";
                            document.querySelector('#linking_progress_text').innerText = "Linking complete!";
                            document.querySelector('#linking_ptext_loading').classList.add('hide');
                            $("#linking_next").fadeIn(function() {
                                $("#linking_another").focus();
                            });
                        },
                        failure: function(data, status) {
                            document.querySelector("#linking_setholding .text-danger").classList.remove("hide");
                        }
                    });
                });
            },
            failure: function(data, status) {
                document.querySelector("#linking_setbib .text-danger").classList.remove("hide");
                console.log("FAIL", data, status);
            },
        });
    });
    // send_active_message({
    //     "greeting": "linking_link_item",
    //     "MMSID": MMSID,
    //     "callnum": callnum,
    //     "defaults": defaults,
    //     "lookup": lookup,
    // }, function(response) {
    //     window.close();
    // });
}

/**
 * Create an alert in the element provided
 * @param  {[htmlelement]} elem     element to put alert in
 * @param  {[string]} message       message for the alert
 * @param  {[string]} colour        colour of the alert
 */
function create_alert_in_element(elem, message, colour) {
    const new_alert = document.createElement("div");
    let type = "danger";
    if (colour) {
        type = colour;
    }
    new_alert.className = "alert alert-" + type + " alert-dismissible fade show";
    new_alert.role = "alert";
    new_alert.innerHTML = message;
    new_alert.innerHTML += "<button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>";
    elem.insertBefore(new_alert, elem.childNodes[0]);
}

/**
 * Send a message to the currently active tab
 * @param  {[object]} message the message details to send
 * @param  {[Function]} callback response callback
 */
function send_active_message(message, callback) {
    chrome.tabs.query({
        active: true,
        currentWindow: true,
    }, function(tabs) {
        if (callback) {
            chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
                callback(response);
            });
        } else {
            chrome.tabs.sendMessage(tabs[0].id, message);
        }
    });
}

/**
 * Get today's date
 * @return {[string]} date
 */
function today() {
    const d = new Date();
    const year = d.getFullYear().toString();
    let month = (d.getMonth() + 1).toString();
    let day = d.getDate().toString();
    if (month.length === 1) {
        month = "0" + month;
    }
    if (day.length === 1) {
        day = "0" + day;
    }
    return year + month + day;
}

/**
 * Check that a stats input is safe
 * @param  {[type]} input_id  id of the input
 * @param  {[type]} output_id id of the output
 * @param  {[type]} subfield  letter of the subfield
 * @return {[type]}           return on failure
 */
function check_stats_input(input_id, output_id, subfield) {
    const input = document.getElementById(input_id).value;
    if (!/^[a-z\- A-Z]*$/g.test(input) && input_id === "stats_note") {
        if (document.querySelectorAll("#stats_error div.alert").length === 0) {
            create_alert_in_element(document.getElementById("stats_error"), "Field can only contain text or dashes");
        }
        return false;
    }
    if (input === "") {
        document.getElementById(output_id).innerText = "";
    } else {
        document.getElementById(output_id).innerText = "$$" + subfield + input;
    }
}

/**
 * Initialise the Statistics utility using APIs
 * @param {[string]} prefix prefix for element names
 */
function api_bib_go(prefix, mms_id) {
    // stop if the user hasn't entered an API key
    if (!key) {
        console.log("no key");
        create_alert_in_element(document.getElementById(prefix + "_error"), "No API key stored in settings");
        return;
    }

    // fade in the next section
    $("#" + prefix + "_record_selection").fadeOut(function() {
        $("#" + prefix + "_holding_selection").fadeIn();

        // request the bib record from the Alma
        if (!mms_id) {
            mms_id = document.getElementById(prefix + "_bib").value;
        }
        $.get(construct_api_url("retrieve_bib", mms_id), function(bib, status) {
            if (status != "success") {
                console.log("API error", data, status);
                return;
            }

            // extract the encoding level from the record
            const LDR = bib.querySelector("leader");
            let enc = LDR.textContent.substring(17, 18);
            if (enc === " ") {
                enc = "#";
            }

            // request the list of holding records associated with this bib record
            $.get(construct_api_url("retrieve_holding_list", mms_id), function(data, status) {
                if (status != "success") {
                    console.log("API error", data, status);
                    return;
                }
                console.log("check here");
                // remove the loading screen
                $("#" + prefix + "_holdings_loading").fadeOut(function() {
                    const holdings = data.querySelectorAll("holding");
                    console.log(holdings);
                    console.log();
                    // if there is only one holding record, automatically select this one
                    if (holdings.length == 1) {
                        details = {
                            "prefix": prefix,
                            "bib": mms_id,
                            "holding": holdings[0].querySelector("holding_id").textContent,
                            "location": holdings[0].querySelector("location").textContent,
                            "enc": prefix == "api_stats" ? enc : null,
                        };
                        holdings_prep(details);
                    } else {
                        // reformat the holdings list for the users
                        display_holdings_list(prefix + "_holdings", holdings, function() {
                            details = {
                                "prefix": prefix,
                                "bib": mms_id,
                                "holding": this.querySelector("small").innerText,
                                "location": this.querySelector(".location").innerText,
                                "enc": prefix == "api_stats" ? enc : null,
                            };
                            holdings_prep(details);
                        });
                    }
                });
            });
        });
    });
}


function display_holdings_list(listid, holdings, eachonclick) {
    for (let i = 0; i < holdings.length; i++) {
        const list = document.getElementById(listid);
        const new_item = document.createElement("a");
        new_item.className = "list-group-item list-group-item-action stat-li";

        const cont = document.createElement("div");
        cont.className = "d-flex w-100 justify-content-between";

        const title = document.createElement("h6");
        title.innerHTML = holdings[i].querySelector("library").getAttribute("desc") + " - <span class='location'>" + holdings[i].querySelector("location").textContent + '</span>';

        const id = document.createElement("small");
        id.classname = "holding_mms";
        id.innerText = holdings[i].querySelector("holding_id").textContent;

        cont.appendChild(title);
        cont.appendChild(id);
        new_item.appendChild(cont);
        new_item.href = "#";
        list.appendChild(new_item);

        // when clicked, select this holding record
        new_item.addEventListener("click", eachonclick);

        // produces 'animated' effect by delaying
        setTimeout(function() {
            new_item.classList.add("show");
        }, 10);
    }
}

/**
 * Prepare to create a statistic using APIs
 * @param {[object]} details details about the elements
 */
function holdings_prep(details) {
    document.getElementById(details.prefix + "_bib_id").innerText = details.bib;
    document.getElementById(details.prefix + "_holding_id").innerText = details.holding;
    if (details.enc) {
        document.getElementById(details.prefix + "_enc").value = details.enc;
    }
    if (details.location && document.getElementById(details.prefix + "_location")) {
        document.getElementById(details.prefix + "_location").innerText = details.location;
    }
    $("#" + details.prefix + "_holdings").fadeOut(function() {
        // present the next input screen (statistics concludes with api_stats_go function)
        $("#" + details.prefix + "_input").fadeIn(function() {
            document.getElementById("periodicals_barcode").focus();
        });
    });
}

/**
 * Record statistics with API
 * @return {[boolean]} on failure
 */
function api_stats_go() {
    // remove the input page and present a loading screen which turns into feedback
    $("#api_stats_input").fadeOut(function() {
        $("#api_stats_feedback").fadeIn();
    });

    // this next section constructs the 920 field and ensures all of the necessary subfields are present and correct
    const bib_id = document.getElementById("api_stats_bib_id").innerText;
    const holding_id = document.getElementById("api_stats_holding_id").innerText;
    const new_field = document.createElement("datafield");
    new_field.setAttribute("ind1", "1");
    new_field.setAttribute("ind2", "1");
    new_field.setAttribute("tag", "920");

    const required = ["a", "d", "e", "f", "g"];
    const selectors = [".btn-stats.active input", "#api_stats_string_date", "#api_stats_unit", "#api_stats_cataloguer", "#api_stats_enc"];
    for (let i = 0; i < required.length; i++) {
        if (document.querySelector(selectors[i]).value == "") {
            console.log(required[i], selectors[i]);
            create_alert_in_element(document.getElementById("stats_error"), "Please fill out all fields (note optional)");
            return false;
        } else {
            const new_sub = document.createElement("subfield");
            new_sub.setAttribute("code", required[i]);
            let val = document.querySelector(selectors[i]).value;
            if (val === undefined) {
                val = document.querySelector(selectors[i]).innerText;
            }
            new_sub.innerText = val;
            new_field.appendChild(new_sub);
        }
    }

    // now get this specific holding record content (so that we can insert the 920 field)
    const url = construct_api_url("retrieve_holding", bib_id, holding_id);
    $.get(url, function(holding, status) {
        const filename = 'Alma_backup_statistics_' + bib_id + '_' + holding_id + '.xml';
        const downloader = document.createElement('a');
        const bb = new Blob([new XMLSerializer().serializeToString(holding.documentElement)], {type: 'text/xml'});

        downloader.setAttribute('href', window.URL.createObjectURL(bb));
        downloader.setAttribute('download', filename);

        // check that the field is not already present and throw an error if this is the case
        const checks = fields = holding.querySelectorAll("datafield[tag='920']");
        if (checks.length != 0) {
            console.log(checks, "ERROR HERE");
            const table = document.getElementById("api_stats_old_stat");
            for (i = 0; i < checks[0].children.length; i++) {
                const row = table.querySelector("td." + checks[0].children[i].getAttribute("code"));
                if (row) {
                    row.innerText = checks[0].children[i].textContent;
                }
            }
            document.getElementById("api_stats_failure_reason").innerText = "920 Field already present in record";
            table.classList.remove("hide");
            $("#api_stats_feedback_loading").fadeOut(function() {
                $("#api_stats_feedback_failure").fadeIn();
            });
            return;
        }

        // add the new field!
        holding.querySelector("record").appendChild(new_field);

        // format the holding for an http request and update it using the api
        const new_holding_string = new XMLSerializer().serializeToString(holding.documentElement);

        $.ajax({
            url: url,
            method: "PUT",
            contentType: "application/xml",
            data: new_holding_string,
            success: function(data, status) {
                console.log(data, status);
                $("#api_stats_feedback_loading").fadeOut(function() {
                    $("#api_stats_feedback_success").fadeIn();
                });
                downloader.click();
            },
            failure: function(data, status) {
                console.log("FAIL", data, status);
                document.getElementById("api_stats_failure_reason").innerText = "Write failed with code " + status;
                $("#api_stats_feedback_loading").fadeOut(function() {
                    $("#api_stats_feedback_failure").fadeIn();
                });
            },
        });
    });
}

function periodicals_record() {
    // remove the input page and present a loading screen which turns into feedback
    $("#periodicals_input").fadeOut(function() {
        $("#periodicals_feedback").fadeIn();
    });

    // get the bib and holding id from page
    const bib_id = document.getElementById("periodicals_bib_id").innerText;
    const holding_id = document.getElementById("periodicals_holding_id").innerText;

    // retrieve the current item list to get a default Item object
    const url = construct_api_url("retrieve_item_list", bib_id, holding_id);
    $.get(url, function(items, status) {
        // make a copy of the old item
        const old_item = items.querySelector("item");
        const new_item = old_item.cloneNode(true);

        const item_data = new_item.querySelector("item_data");
        for (let i = 0; i < item_data.childNodes.length; i++) {
            if (item_data.getAttribute("desc") != null) {
                item_data.childNodes[i].nodeValue = "";
                item_data.childNodes[i].textContent = "";
            }
        }

        // get barcode from input
        item_data.querySelector("barcode").innerHTML = document.getElementById("periodicals_barcode").value;

        // write date in correct format
        const dobj = new Date();
        const d = dobj.getDate();
        const m = dobj.getMonth() + 1;
        const yyyy = dobj.getFullYear().toString();
        const dd = d < 10 ? "0" + d.toString() : d.toString();
        const mm = m < 10 ? "0" + m.toString() : m.toString();

        const date_string = yyyy + "-" + mm + "-" + dd + "Z";
        console.log(date_string);
        if (item_data.querySelector("arrival_date")) {
            item_data.querySelector("arrival_date").innerHTML = date_string;
        }
        if (item_data.querySelector("creation_date")) {
            item_data.querySelector("creation_date").innerHTML = date_string;
        }
        if (item_data.querySelector("modification_date")) {
            item_data.querySelector("modification_date").innerHTML = date_string;
        }

        // default value always the same
        const pmt = item_data.querySelector("physical_material_type");
        pmt.innerHTML = "ISSBD";
        pmt.setAttribute("desc", "Bound Issue");

        // change policy based location
        const policy = item_data.querySelector("policy");
        const loc = document.getElementById("periodicals_location").innerText;
        if (loc.includes("HDJUD")) {
            policy.innerHTML = 91;
        } else if (loc.includes("GEN") || loc.includes("WIDLC")) {
            policy.innerHTML = 02;
        } else {
            policy.innerHTML = "UNKNOWN LOCATION";
        }

        // get enumerations and chronology from input
        if (parseInt(document.getElementById("periodicals_enuma").value) !== 0) {
            item_data.querySelector("enumeration_a").innerHTML = document.getElementById("periodicals_enuma").value;
        }
        if (parseInt(document.getElementById("periodicals_enumb").value) !== 0) {
            item_data.querySelector("enumeration_b").innerHTML = document.getElementById("periodicals_enumb").value;
        }
        item_data.querySelector("chronology_i").innerHTML = document.getElementById("periodicals_chroni").value;
        item_data.querySelector("description").innerHTML = document.getElementById("periodicals_desc").value;

        new_item.removeChild(new_item.querySelector("item_data"));
        new_item.appendChild(item_data);
        console.log(new_item);

        // convert object to string and POST to Alma API
        const new_items_string = new XMLSerializer().serializeToString(new_item);
        $.ajax({
            url: url,
            method: "POST",
            contentType: "application/xml",
            data: new_items_string,
            success: function(data, status) {
                console.log(data, status);
                $("#periodicals_feedback_loading").fadeOut(function() {
                    $("#periodicals_feedback_success").fadeIn();
                    setTimeout(function() {
                        send_active_message({"greeting": "edit_holding_record", "mms": bib_id, 'holding': holding_id});
                        send_active_message({"greeting": "show_holding_window", "desc": document.getElementById("periodicals_subfield_desc").value});
                    }, 3000);
                });
            },
            failure: function(data, status) {
                console.log("FAIL", data, status);
                document.getElementById("periodicals_failure_reason").innerText = "Write failed with code " + status;
                $("#periodicals_feedback_loading").fadeOut(function() {
                    $("#periodicals_feedback_failure").fadeIn();
                });
            },
        });
    });
}

/**
 * Construct a description for periodicals based on enuma,b and chron
 */
function construct_periodicals_description() {
    let enuma = document.getElementById("periodicals_enuma").value.trim();
    const enumb = document.getElementById("periodicals_enumb").value.trim();
    const chroni = document.getElementById("periodicals_chroni").value.trim();

    let desc = "";
    let subfield_desc = ""
    if (document.getElementById("periodicals_month").classList.contains("active")) {
        enuma = issues_to_months(enuma);
        desc = chroni + ":" + enuma;
        subfield_desc = chroni + " $$b " + enuma;
    } else {
        if (enuma != "" || parseInt(enuma) == 0) {
            if (enumb == "" || parseInt(enumb) == 0) {
                desc = "pt." + enuma + " (" + chroni + ")";
                subfield_desc = enuma + " $$i " + chroni;
            } else {
                desc = "v." + enumb + ":pt." + enuma + " (" + chroni + ")";
                subfield_desc = enumb + " $$b " + enuma + " $$i " + chroni;
            }
        } else {
            if (chroni != "") {
                desc = chroni;
                subfield_desc = chroni;
            }
        }
    }

    return [subfield_desc, desc];
}

function issues_to_months(list) {
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

    // split up list in ranges
    let ranges = list.split(",");
    for (let i = 0; i < ranges.length; i++) {

        // split up each range into months
        months = ranges[i].split("-");
        for (let i = 0; i < months.length; i++) {
            // convert months to text
            months[i] = monthNames[parseInt(months[i]) - 1];
        }
        // rejoin months
        ranges[i] = months.join("-");
    }
    // rejoin ranges
    list = ranges.join(",");

    return list;
}

/**
 * Get cataloguer name, encoding level and record and MMS ID
 */
function stats_prep(get_cat) {
    if (get_cat) {
        send_active_message({
            "greeting": "introductions",
        }, function(cat) {
            if (cat) {
                document.getElementById("stats_cataloguer").value = cat;
                check_stats_input("stats_cataloguer", "stats_string_cataloguer", "f");

                document.getElementById("api_stats_cataloguer").value = cat;
                check_stats_input("api_stats_cataloguer", "api_stats_string_cataloguer", "f");
            } else {
                create_alert_in_element(document.getElementById("stats_error"), "Couldn't find username from Alma. Is Alma open?");
                create_alert_in_element(document.getElementById("api_stats_error"), "Couldn't find username from Alma. Is Alma open?");
            }
        });
    }
    send_active_message({
        "greeting": "record_information",
    }, function(response) {
        console.log(response);
        if (response) {
            if (response.encoding) {
                document.getElementById("stats_enc").value = response.encoding;
                check_stats_input("stats_enc", "stats_string_enc", "g");
            } else {
                create_alert_in_element(document.getElementById("stats_error"), "Couldn't find encoding level from Alma. Is Alma open?");
            }
            if (response.mms_id) {
                if (response.mms_id.substr(0, 2) !== "99") {
                    create_alert_in_element(document.getElementById("api_stats_error"), "Holding Record present on screen, please close before continuing");
                    return;
                }
                document.getElementById("api_stats_bib").value = response.mms_id;
                document.getElementById("api_stats_bib_go").click();
            }
        }
    });
}

/**
 *
 */
function add_periodicals_prefix(callnum) {
    if (callnum.match(/^[0-9]+$/) != null) {
        return callnum;
    }

    const base_number = parseInt(callnum.split(".")[0]);
    console.log(base_number, callnum)
    let prefix = "";
    if (base_number <= 500) {
        prefix = "PHeb ";
    } else if (800 < base_number && base_number <= 999) {
        prefix = "AsiaDoc";
    } else if (1000 < base_number && base_number <= 1999) {
        prefix = "PJud";
    } else if (2000 < base_number && base_number <= 5000) {
        prefix = "YP";
    } else {
        prefix = "Invalid Base Number";
    }
    return prefix + callnum;
}

function construct_api_url(api_call, bib_mms, holding_mms) {
    url = "https://api-na.hosted.exlibrisgroup.com/almaws/v1/"
    if (api_call === "retrieve_bib") {
        url += "bibs/" + bib_mms
    } else if (api_call === "retrieve_holding_list") {
        url += "bibs/" + bib_mms + "/holdings"
    } else if (api_call === "retrieve_holding") {
        url += "bibs/" + bib_mms + "/holdings/" + holding_mms
    } else if (api_call === "retrieve_item_list") {
        url += "bibs/" + bib_mms + "/holdings/" + holding_mms + "/items"
    } else {
        return "Error: API call not found."
    }
    url += "?apikey=" + key;
    return url;
}