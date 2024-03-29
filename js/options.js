$(function() {
    // setup completion buttons
    document.getElementById("save").addEventListener("click", function() {
        save_options(false);
    });
    document.getElementById("save_and_close").addEventListener("click", function() {
        save_options(true);
    });
    document.getElementById("close").addEventListener("click", function() {
        window.close();
    });

    document.getElementById("unit_add").addEventListener("click", function() {
        const name = document.getElementById("new_unit_name");
        const code = document.getElementById("new_unit_code");
        if (name.value !== "" && code.value !== "") {
            create_unit_option({
                "name": name.value,
                "code": code.value,
            });
            name.value = "";
            code.value = "";
        }
    });
    document.getElementById("new_unit_name").addEventListener("keydown", function(e) {
        if (e.keyCode == 13) {
            document.getElementById("unit_add").click();
        }
    });
    restore_options();
});

/**
 * Save options to chrome.storage
 * @param  {[bool]} close whether to close the page on completion
 */
function save_options(close) {
    // collect information from the page
    const status = document.getElementById("status");
    const lib = [];
    const units = document.querySelectorAll("#unit_holder .row");
    for (let i = 0; i < units.length; i++) {
        lib.push({
            "name": units[i].querySelector(".unit-name").innerText,
            "code": units[i].querySelector(".unit-code").innerText,
        });
    }

    const api_key = document.getElementById("api_key").value;
    if (api_key == "KEY IN STORAGE" || api_key == "No key of this type stored") {
        new_data = {
            "library_unit": lib,
            "stats_focus": document.querySelector("#stats_focus .btn.active").getAttribute("data-selector"),
        };
    } else {
        new_data = {
            "library_unit": lib,
            "stats_focus": document.querySelector("#stats_focus .btn.active").getAttribute("data-selector"),
            "api_key": api_key,
            "api_key_type": document.getElementById("api_key_type").selectedIndex,
        };
    }

    // save the new options to chrome.storage
    chrome.storage.sync.set(new_data, function() {
        // change the status to let the user know that it worked
        if (close) {
            status.innerHTML = "<hr>Options Saved - closing now!<hr>";
        } else {
            status.innerHTML = "<hr>Options Saved!<hr>";
        }
        status.classList.add("expand");

        // reset the status after a moment for cleanliness
        setTimeout(function() {
            status.classList.remove("expand");
            status.innerHTML = "";
            if (close) {
                window.close();
            }
        }, 1500);
    });
}

/**
 * Fill the initial settings page with the current settings in storage
 */
function restore_options() {
    chrome.storage.sync.get(["library_unit", "stats_focus", "api_key_type"], function(items) {
        if (items.library_unit) {
            console.log(items.library_unit);
            for (let i = 0; i < items.library_unit.length; i++) {
                create_unit_option(items.library_unit[i]);
            }
            update_dropdown();
        }
        if (items.stats_focus) {
            const focus_toggle = document.querySelector("#stats_focus .btn[data-selector='" + items.stats_focus + "']");
            focus_toggle.click();
        }
        if (items.api_key_type) {
            document.getElementById("api_key").value = "KEY IN STORAGE";
            document.getElementById("api_key_type").selectedIndex = items.api_key_type;
            $("#api_key_type").on("change", function() {
                if (this.selectedIndex == items.api_key_type) {
                    $("#api_key").val("KEY IN STORAGE");
                } else {
                    $("#api_key").val("No key of this type stored");
                }
            });
        }
        $("*").blur();
    });
}

/**
 * Update the dropdown with the latest units
 */
function update_dropdown() {
    const names = document.querySelectorAll("#unit_holder .unit-name");
    const drop = document.getElementById("unit_drop");
    $(drop).empty();
    for (let i = 0; i < names.length; i++) {
        const new_opt = document.createElement("option");
        new_opt.value = names[i].innerText;
        new_opt.innerText = names[i].innerText;
        drop.add(new_opt);
    }
}

/**
 * Create a new option for the unit dropdown
 * @param  {[type]} unit unit name and code
 */
function create_unit_option(unit) {
    // copy the template and remove default options
    const curr = document.getElementById("unit_template").cloneNode(true);
    curr.className = "list-group-item border-0";
    curr.id = "";

    // add the name and button events
    curr.querySelector(".unit-name").innerText = unit.name;
    curr.querySelector(".unit-code").innerText = unit.code;
    curr.querySelector(".unit-bin").addEventListener("click", function() {
        curr.parentElement.removeChild(curr);
        update_dropdown();
    });
    curr.querySelector(".unit-up").addEventListener("click", function() {
        const prev = curr.previousSibling;
        if (prev) {
            const curr_name = curr.querySelector(".unit-name").innerText;
            const curr_code = curr.querySelector(".unit-code").innerText;
            curr.querySelector(".unit-name").innerText = prev.querySelector(".unit-name").innerText;
            prev.querySelector(".unit-name").innerText = curr_name;
            curr.querySelector(".unit-code").innerText = prev.querySelector(".unit-code").innerText;
            prev.querySelector(".unit-code").innerText = curr_code;
            update_dropdown();
        }
    });
    curr.querySelector(".unit-down").addEventListener("click", function() {
        const next = curr.nextSibling;
        if (next) {
            next.querySelector(".unit-up").click();
        }
    });
    document.getElementById("unit_holder").appendChild(curr);
}
