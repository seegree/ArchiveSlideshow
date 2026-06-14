#target aftereffects

(function archiveSlideshowPanel(thisObj) {
    var SCRIPT_NAME = "Archive Slideshow";
    var VERSION = "0.3.0";
    var SLIDE_TAG = "Archive Slideshow Slide";
    var MASTER_TAG = "Archive Slideshow Master";
    // A photo displayed beyond this percent of its original size gets a
    // "CHECK ENLARGEMENT" name, comment, and warning label for review.
    var ENLARGEMENT_WARNING_SCALE = 133;
    // Deep blue used by the Soft Background treatment, as both the base field
    // and the color wash that tints the blurred echo behind the photo.
    var SOFT_BG_WASH_COLOR = [0.04, 0.06, 0.16];
    // Warm off-white hairline drawn down the seam of Edge to Edge pairs so the
    // split reads as a deliberate diptych rather than one broken image.
    var EDGE_RULE_COLOR = [0.94, 0.93, 0.90];
    // Refined warm charcoal placed under every slide when the background
    // option is on, so inset layouts sit on a ground instead of pure black.
    var MASTER_BG_COLOR = [0.07, 0.067, 0.063];
    var IMAGE_EXTENSIONS = {
        "jpg": true,
        "jpeg": true,
        "png": true,
        "tif": true,
        "tiff": true,
        "psd": true,
        "bmp": true,
        "gif": true,
        "heic": true,
        "webp": true,
        "exr": true
    };

    var sourceFolder = null;
    var ui = null;
    var projectNameCache = null;
    // Highest photo scale applied while building the current slide comp.
    var maxPhotoScale = 0;

    function buildUI(host) {
        var panel = (host instanceof Panel)
            ? host
            : new Window("palette", SCRIPT_NAME, undefined, { resizeable: true });

        panel.orientation = "column";
        panel.alignChildren = ["fill", "top"];
        panel.spacing = 6;
        panel.margins = 8;

        var sourcePanel = addPanel(panel, "Source");
        var sourceRow = sourcePanel.add("group");
        sourceRow.orientation = "row";
        sourceRow.alignChildren = ["fill", "center"];
        var chooseButton = sourceRow.add("button", undefined, "Choose Folder...");
        chooseButton.preferredSize.width = 112;
        chooseButton.helpTip =
            "Pick the top folder of photos. Subfolders are scanned too.";
        var sourceLabel = sourceRow.add(
            "statictext",
            undefined,
            "No image folder selected"
        );
        sourceLabel.alignment = ["fill", "center"];
        sourceLabel.helpTip =
            "Folders become sections. Images are sorted naturally by filename.";
        var sectionRow = addDropdownRow(
            sourcePanel,
            "Section title cards",
            ["None", "From folder names"],
            1,
            "Insert a title slide at the start of each folder, named after " +
                "the folder."
        );

        var canvasPanel = addPanel(panel, "Canvas");
        var widthRow = addNumberRow(
            canvasPanel,
            "Width",
            1920,
            "px",
            "Width of the slideshow in pixels."
        );
        var heightRow = addNumberRow(
            canvasPanel,
            "Height",
            1080,
            "px",
            "Height of the slideshow in pixels."
        );
        var frameRateRow = addNumberRow(
            canvasPanel,
            "Frame rate",
            30,
            "fps",
            "Frames per second, such as 24, 25, 29.97, or 30."
        );
        var secondsRow = addNumberRow(
            canvasPanel,
            "Seconds / image",
            4,
            "s",
            "How long each photo stays on screen before the next begins."
        );
        var backgroundCheck = canvasPanel.add(
            "checkbox",
            undefined,
            "Add background behind everything"
        );
        backgroundCheck.value = true;
        backgroundCheck.alignment = ["left", "center"];
        backgroundCheck.helpTip =
            "Place a designed dark background under every slide so inset " +
            "layouts sit on a ground instead of black. Recolor or replace " +
            "the MASTER BACKGROUND layer afterward.";

        var stylePanel = addPanel(panel, "Style");
        var treatmentRow = addDropdownRow(
            stylePanel,
            "Image treatment",
            [
                "Auto Mix",
                "Full Bleed",
                "Near Full",
                "Soft Background",
                "Window Frame",
                "Print",
                "Contained"
            ],
            0,
            "How photos are framed on the canvas. Auto Mix varies the " +
                "framing based on each photo's size, shape, and quality."
        );
        var motionRow = addDropdownRow(
            stylePanel,
            "Movement",
            ["Still", "Gentle Push", "Gentle Drift", "Push + Drift", "Cycle"],
            1,
            "How photos move during a slide. Gentle Push is the calm " +
                "default; Cycle rotates through the moving styles, favoring " +
                "push."
        );
        var lookRow = addDropdownRow(
            stylePanel,
            "Color treatment",
            ["Off", "Monochrome", "Faded"],
            0,
            "Optional color wash applied to every photo."
        );

        var pairsPanel = addPanel(panel, "Photo Pairs");
        var multiRow = addDropdownRow(
            pairsPanel,
            "Pair photos",
            ["Never", "Occasionally", "When low-res", "As often as possible"],
            1,
            "When two photos share one slide. Low-resolution photos pair " +
                "up so each needs less enlargement."
        );
        var multiStyleRow = addDropdownRow(
            pairsPanel,
            "Pair style",
            [
                "Auto Mix",
                "Hero + Support",
                "Offset Pair",
                "Window Frame",
                "Prints",
                "Clean",
                "Edge to Edge"
            ],
            0,
            "Layout used when two photos share a slide. Auto Mix varies " +
                "the style."
        );
        var pairTimingRow = addDropdownRow(
            pairsPanel,
            "Pair length",
            ["Standard", "Doubled"],
            0,
            "Doubled keeps paired slides on screen twice as long, so each " +
                "photo gets its full time."
        );

        var transitionPanel = addPanel(panel, "Transitions");
        var transitionHelp = transitionPanel.add(
            "statictext",
            undefined,
            "Checked styles cycle in order. Check one to use it throughout."
        );
        transitionHelp.alignment = ["fill", "top"];
        var transitionChoices = transitionPanel.add("group");
        transitionChoices.orientation = "row";
        transitionChoices.alignChildren = ["left", "center"];
        var cutCheck = transitionChoices.add("checkbox", undefined, "Cut");
        cutCheck.helpTip = "Instant change with no overlap.";
        var dissolveCheck = transitionChoices.add(
            "checkbox",
            undefined,
            "Dissolve"
        );
        dissolveCheck.helpTip = "One slide fades into the next.";
        var pushCheck = transitionChoices.add("checkbox", undefined, "Push");
        pushCheck.helpTip =
            "The next slide pushes the current one off screen.";
        cutCheck.value = false;
        dissolveCheck.value = true;
        pushCheck.value = false;
        var transitionDurationRow = addNumberRow(
            transitionPanel,
            "Duration",
            0.6,
            "s",
            "Length of each dissolve or push, in seconds."
        );

        var qualityPanel = addPanel(panel, "Quality");
        var upscaleRow = addNumberRow(
            qualityPanel,
            "Max enlargement",
            110,
            "%",
            "How far photos may be enlarged past their original size " +
                "before switching to a protective layout. 100 means never " +
                "enlarge. Over-enlarged slides are labeled CHECK " +
                "ENLARGEMENT for review."
        );

        var buildButton = panel.add(
            "button",
            undefined,
            "Build Editable Slideshow"
        );
        buildButton.alignment = ["fill", "top"];
        buildButton.preferredSize.height = 32;
        buildButton.helpTip =
            "Create the slideshow. Everything generated is ordinary, " +
            "editable After Effects material.";

        var status = panel.add(
            "statictext",
            undefined,
            "Choose a folder of archive images to begin.",
            { multiline: true }
        );
        status.alignment = ["fill", "top"];
        status.preferredSize.height = 38;

        ui = {
            sourceLabel: sourceLabel,
            sectionCards: sectionRow.input,
            width: widthRow.input,
            height: heightRow.input,
            frameRate: frameRateRow.input,
            seconds: secondsRow.input,
            background: backgroundCheck,
            pairTiming: pairTimingRow.input,
            treatment: treatmentRow.input,
            maxUpscale: upscaleRow.input,
            multi: multiRow.input,
            multiStyle: multiStyleRow.input,
            motion: motionRow.input,
            look: lookRow.input,
            cut: cutCheck,
            dissolve: dissolveCheck,
            push: pushCheck,
            transitionDuration: transitionDurationRow.input,
            status: status
        };

        chooseButton.onClick = chooseSourceFolder;
        buildButton.onClick = buildFromUI;
        panel.onResizing = panel.onResize = function () {
            this.layout.resize();
        };

        panel.layout.layout(true);
        return panel;
    }

    function addPanel(parent, title) {
        var panel = parent.add("panel", undefined, title);
        panel.orientation = "column";
        panel.alignChildren = ["fill", "top"];
        panel.spacing = 4;
        panel.margins = 8;
        return panel;
    }

    function addNumberRow(parent, label, value, suffixText, helpTip) {
        var row = parent.add("group");
        row.orientation = "row";
        row.alignChildren = ["left", "center"];
        var labelControl = row.add("statictext", undefined, label);
        labelControl.preferredSize.width = 104;
        var input = row.add("edittext", undefined, String(value));
        input.characters = 8;
        var suffix = row.add(
            "statictext",
            undefined,
            suffixText === undefined ? "" : suffixText
        );
        if (helpTip !== undefined) {
            labelControl.helpTip = helpTip;
            input.helpTip = helpTip;
        }
        return { row: row, input: input, suffix: suffix };
    }

    function addDropdownRow(parent, label, items, selectedIndex, helpTip) {
        var row = parent.add("group");
        row.orientation = "row";
        row.alignChildren = ["left", "center"];
        var labelControl = row.add("statictext", undefined, label);
        labelControl.preferredSize.width = 104;
        var input = row.add("dropdownlist", undefined, items);
        input.selection = selectedIndex;
        input.alignment = ["fill", "center"];
        input.preferredSize.width = 150;
        if (helpTip !== undefined) {
            labelControl.helpTip = helpTip;
            input.helpTip = helpTip;
        }
        return { row: row, input: input };
    }

    function setStatus(text) {
        if (ui === null) {
            return;
        }
        ui.status.text = text;
        try {
            // Repaint so progress is visible while the script keeps working.
            ui.status.window.update();
        } catch (error) {
            // Some hosts cannot repaint mid-script; the build continues anyway.
        }
    }

    function displayFileName(fileOrFolder) {
        var name = fileOrFolder.displayName;
        if (name === undefined || name === null || name === "") {
            name = fileOrFolder.name;
        }
        return String(name);
    }

    function chooseSourceFolder() {
        var chosen = Folder.selectDialog("Choose the archive image folder");
        if (chosen === null) {
            return;
        }
        sourceFolder = chosen;
        ui.sourceLabel.text = displayFileName(chosen);

        try {
            var sections = scanSections(chosen);
            var count = countFiles(sections);
            ui.status.text =
                count + " image" + (count === 1 ? "" : "s") +
                " found in " + sections.length + " section" +
                (sections.length === 1 ? "." : "s.");
        } catch (error) {
            ui.status.text = "Could not scan the selected folder.";
            alert(error.message, SCRIPT_NAME);
        }
    }

    function buildFromUI() {
        if (sourceFolder === null || !sourceFolder.exists) {
            alert("Choose an image folder first.", SCRIPT_NAME);
            return;
        }

        var config = readConfig();
        if (config === null) {
            return;
        }

        var sections;
        try {
            sections = scanSections(sourceFolder);
        } catch (scanError) {
            alert("Could not scan the folder:\n" + scanError.message, SCRIPT_NAME);
            return;
        }
        if (countFiles(sections) === 0) {
            alert("No supported image files were found.", SCRIPT_NAME);
            return;
        }

        app.beginUndoGroup("Build Archive Slideshow");
        try {
            setStatus("Importing images and building slides...");
            var result = buildSlideshow(sections, config);
            var message =
                "Built " + result.slides + " slides from " + result.images +
                " images";
            if (result.warnings > 0) {
                message += " with " + result.warnings + " review warning" +
                    (result.warnings === 1 ? "" : "s");
            }
            if (result.skipped.length > 0) {
                message += "; " + result.skipped.length + " file" +
                    (result.skipped.length === 1 ? "" : "s") + " skipped";
            }
            message += ". Open \"" + result.comp.name + "\" to edit.";
            setStatus(message);
            if (result.skipped.length > 0) {
                reportSkippedFiles(result.skipped);
            }
            result.comp.openInViewer();
        } catch (error) {
            alert("Could not build slideshow:\n" + error.message, SCRIPT_NAME);
            setStatus("Build stopped before completion.");
        } finally {
            app.endUndoGroup();
        }
    }

    function reportSkippedFiles(skipped) {
        var limit = Math.min(skipped.length, 10);
        var names = [];
        var i;
        for (i = 0; i < limit; i += 1) {
            names.push(skipped[i]);
        }
        var message = skipped.length + " file" +
            (skipped.length === 1 ? "" : "s") +
            " could not be imported and " +
            (skipped.length === 1 ? "is" : "are") +
            " not in the slideshow:\n\n" + names.join("\n");
        if (skipped.length > limit) {
            message += "\n...and " + (skipped.length - limit) + " more";
        }
        alert(message, SCRIPT_NAME);
    }

    function readConfig() {
        var width = parseNumber(ui.width.text, "Width", 320, 16384);
        var height = parseNumber(ui.height.text, "Height", 240, 16384);
        var frameRate = parseNumber(ui.frameRate.text, "Frame rate", 1, 120);
        var seconds = parseNumber(ui.seconds.text, "Seconds / image", 0.1, 3600);
        var maxUpscale = parseNumber(
            ui.maxUpscale.text,
            "Max enlargement",
            1,
            1000
        );
        var transitionDuration = parseNumber(
            ui.transitionDuration.text,
            "Transition duration",
            0,
            30
        );

        if (
            width === null ||
            height === null ||
            frameRate === null ||
            seconds === null ||
            maxUpscale === null ||
            transitionDuration === null
        ) {
            return null;
        }

        var transitions = [];
        if (ui.cut.value) {
            transitions.push("Cut");
        }
        if (ui.dissolve.value) {
            transitions.push("Dissolve");
        }
        if (ui.push.value) {
            transitions.push("Push");
        }
        if (transitions.length === 0) {
            alert("Check at least one transition style.", SCRIPT_NAME);
            return null;
        }

        return {
            width: Math.round(width),
            height: Math.round(height),
            frameRate: frameRate,
            seconds: seconds,
            background: ui.background.value,
            sectionCards: selectedText(ui.sectionCards),
            pairTiming: selectedText(ui.pairTiming),
            treatment: selectedText(ui.treatment),
            maxUpscale: maxUpscale,
            multi: selectedText(ui.multi),
            multiStyle: selectedText(ui.multiStyle),
            motion: selectedText(ui.motion),
            look: selectedText(ui.look),
            transitions: transitions,
            transitionDuration: transitionDuration
        };
    }

    function parseNumber(text, label, minimum, maximum) {
        var value = Number(text);
        if (!isFinite(value) || value < minimum || value > maximum) {
            alert(
                label + " must be between " + minimum + " and " + maximum + ".",
                SCRIPT_NAME
            );
            return null;
        }
        return value;
    }

    function selectedText(dropdown) {
        return dropdown.selection === null ? "" : dropdown.selection.text;
    }

    function scanSections(root) {
        var sections = [];
        scanFolder(root, root, sections, 0);
        return sections;
    }

    function scanFolder(folder, root, sections, depth) {
        if (depth > 20) {
            // Folder aliases can point back up the tree; stop runaway nesting.
            return;
        }
        var entries = folder.getFiles();
        var files = [];
        var folders = [];
        var i;

        for (i = 0; i < entries.length; i += 1) {
            if (entries[i].name.charAt(0) === ".") {
                // Hidden entries, including macOS "._" sidecar files.
                continue;
            }
            if (entries[i] instanceof Folder) {
                folders.push(entries[i]);
            } else if (isSupportedImage(entries[i])) {
                files.push(entries[i]);
            }
        }

        files.sort(naturalFileCompare);
        folders.sort(naturalFileCompare);

        if (files.length > 0) {
            sections.push({
                name: relativeSectionName(folder, root),
                folder: folder,
                files: files
            });
        }

        for (i = 0; i < folders.length; i += 1) {
            scanFolder(folders[i], root, sections, depth + 1);
        }
    }

    function isSupportedImage(file) {
        var match = file.name.toLowerCase().match(/\.([^.]+)$/);
        return match !== null && IMAGE_EXTENSIONS[match[1]] === true;
    }

    function naturalFileCompare(first, second) {
        return naturalCompare(
            displayFileName(first),
            displayFileName(second)
        );
    }

    function naturalCompare(first, second) {
        var left = String(first).toLowerCase().split(/(\d+)/);
        var right = String(second).toLowerCase().split(/(\d+)/);
        var length = Math.max(left.length, right.length);
        var i;
        for (i = 0; i < length; i += 1) {
            if (left[i] === undefined) {
                return -1;
            }
            if (right[i] === undefined) {
                return 1;
            }
            if (left[i] === right[i]) {
                continue;
            }
            if (/^\d+$/.test(left[i]) && /^\d+$/.test(right[i])) {
                return Number(left[i]) - Number(right[i]);
            }
            return left[i] < right[i] ? -1 : 1;
        }
        return 0;
    }

    function relativeSectionName(folder, root) {
        if (folder.fsName === root.fsName) {
            return cleanDisplayName(displayFileName(root));
        }
        var rootPath = root.fsName;
        var path = folder.fsName;
        if (path.indexOf(rootPath) === 0) {
            path = path.substring(rootPath.length);
        }
        path = path.replace(/^[\\\/]+/, "");
        return cleanDisplayName(path.replace(/[\\\/]+/g, " / "));
    }

    function cleanDisplayName(name) {
        var text = String(name);
        text = text.replace(/^\s*\d+[\s._-]+/, "");
        text = text.replace(/[_-]+/g, " ");
        return text === "" ? "Archive" : text;
    }

    function countFiles(sections) {
        var count = 0;
        var i;
        for (i = 0; i < sections.length; i += 1) {
            count += sections[i].files.length;
        }
        return count;
    }

    function buildSlideshow(sections, config) {
        resetProjectNameCache();

        var rootName = safeName(displayFileName(sourceFolder));
        var projectFolder = app.project.items.addFolder(
            uniqueProjectItemName("Archive Slideshow - " + rootName)
        );
        var mediaFolder = app.project.items.addFolder("Imported Images");
        mediaFolder.parentFolder = projectFolder;
        var slidesFolder = app.project.items.addFolder("Slide Comps");
        slidesFolder.parentFolder = projectFolder;

        var skippedFiles = [];
        var importedSections = importSections(
            sections,
            mediaFolder,
            skippedFiles
        );
        if (countImportedImages(importedSections) === 0) {
            throw new Error(
                "After Effects could not import any of the supported image files."
            );
        }
        var slideSpecs = makeSlideSpecs(importedSections, config);
        var slideItems = [];
        var i;

        for (i = 0; i < slideSpecs.length; i += 1) {
            setStatus(
                "Building slide " + (i + 1) + " of " + slideSpecs.length + "..."
            );
            slideItems.push(
                createSlideComp(
                    slideSpecs[i],
                    i,
                    slideSpecs.length,
                    config,
                    slidesFolder
                )
            );
        }

        setStatus("Assembling master timeline...");
        var schedule = makeSchedule(slideItems, config);
        var master = app.project.items.addComp(
            uniqueProjectItemName(rootName + " Slideshow"),
            config.width,
            config.height,
            1,
            schedule.duration,
            config.frameRate
        );
        master.parentFolder = projectFolder;
        master.comment =
            MASTER_TAG + "\nVersion " + VERSION +
            "\nSource: " + sourceFolder.fsName;
        assembleMaster(master, slideItems, schedule, config);
        if (config.background) {
            addMasterBackground(master);
        }

        return {
            comp: master,
            slides: slideItems.length,
            images: countImportedImages(importedSections),
            warnings: countSlideWarnings(slideItems),
            skipped: skippedFiles
        };
    }

    function importSections(sections, parentFolder, skipped) {
        var imported = [];
        var totalFiles = countFiles(sections);
        var processed = 0;
        var i;
        var j;
        for (i = 0; i < sections.length; i += 1) {
            var sectionFolder = app.project.items.addFolder(
                safeName(sections[i].name)
            );
            sectionFolder.parentFolder = parentFolder;
            var items = [];
            for (j = 0; j < sections[i].files.length; j += 1) {
                processed += 1;
                setStatus(
                    "Importing image " + processed + " of " + totalFiles + "..."
                );
                try {
                    var options = new ImportOptions(sections[i].files[j]);
                    var item = app.project.importFile(options);
                    item.parentFolder = sectionFolder;
                    items.push({
                        item: item,
                        file: sections[i].files[j]
                    });
                } catch (error) {
                    // This AE installation cannot decode the file; report it later.
                    skipped.push(displayFileName(sections[i].files[j]));
                }
            }
            if (items.length > 0) {
                imported.push({
                    name: sections[i].name,
                    items: items
                });
            } else {
                sectionFolder.remove();
            }
        }
        return imported;
    }

    function countImportedImages(sections) {
        var count = 0;
        var i;
        for (i = 0; i < sections.length; i += 1) {
            count += sections[i].items.length;
        }
        return count;
    }

    function makeSlideSpecs(sections, config) {
        var specs = [];
        var i;
        var j;
        for (i = 0; i < sections.length; i += 1) {
            if (config.sectionCards === "From folder names") {
                specs.push({
                    type: "section",
                    title: sections[i].name,
                    duration: Math.max(1.5, config.seconds * 0.75)
                });
            }

            var items = sections[i].items.slice(0);
            j = 0;
            var previousWasPair = false;
            var slidesSinceHero = 0;
            while (j < items.length) {
                var first = items[j];
                var forceHero =
                    (j === 0 || slidesSinceHero >= 3) &&
                    isLandscapeImage(first.item) &&
                    isExpectedHero(first.item, config);
                var partnerIndex = -1;
                if (
                    config.multi !== "Never" &&
                    !previousWasPair &&
                    !forceHero &&
                    j > 0
                ) {
                    partnerIndex = findPairPartner(items, j, config);
                }

                if (partnerIndex !== -1) {
                    var second = items[partnerIndex];
                    items.splice(partnerIndex, 1);
                    specs.push({
                        type: "images",
                        section: sections[i].name,
                        images: [first, second],
                        duration: config.seconds *
                            (config.pairTiming === "Doubled" ? 2 : 1)
                    });
                    j += 1;
                    previousWasPair = true;
                    slidesSinceHero += 1;
                } else {
                    specs.push({
                        type: "images",
                        section: sections[i].name,
                        images: [first],
                        duration: config.seconds,
                        forceHero: forceHero
                    });
                    j += 1;
                    previousWasPair = false;
                    if (
                        forceHero ||
                        isExpectedHero(first.item, config)
                    ) {
                        slidesSinceHero = 0;
                    } else {
                        slidesSinceHero += 1;
                    }
                }
            }
            if (specs.length > 0) {
                var finalSpec = specs[specs.length - 1];
                if (
                    finalSpec.type === "images" &&
                    finalSpec.section === sections[i].name
                ) {
                    finalSpec.duration *= 1.2;
                }
            }
        }
        return specs;
    }

    function isExpectedHero(item, config) {
        if (
            config.treatment === "Full Bleed" ||
            config.treatment === "Near Full"
        ) {
            return true;
        }
        if (
            config.treatment !== "Auto Mix" ||
            !isLandscapeImage(item)
        ) {
            return false;
        }
        var coverScale = Math.max(
            config.width / item.width,
            config.height / item.height
        ) * 100;
        var nearScale = fitScalePercent(
            item,
            [config.width * 0.94, config.height * 0.92]
        );
        return (
            coverScale <= config.maxUpscale * 1.2 ||
            nearScale <= config.maxUpscale * 1.15
        );
    }

    function isLowResolution(item, config) {
        var coverScale = Math.max(
            config.width / item.width,
            config.height / item.height
        ) * 100;
        return coverScale > config.maxUpscale;
    }

    function shouldPairImages(first, second, index, config) {
        var bothPortrait =
            isPortraitImage(first) &&
            isPortraitImage(second);
        if (bothPortrait) {
            return true;
        }
        if (config.multi === "As often as possible") {
            return true;
        }
        if (
            isLowResolution(first, config) &&
            isLowResolution(second, config)
        ) {
            // Two weak images share a slide so each needs less enlargement,
            // whatever their orientation.
            return true;
        }
        if (isLandscapeImage(first) || isLandscapeImage(second)) {
            return false;
        }
        if (config.multi === "Occasionally") {
            return index % 4 === 0;
        }
        return false;
    }

    function findPairPartner(items, j, config) {
        // Keep the final image of a section out of pairs so sections close
        // on a single slide, and always leave at least one image after the
        // pair.
        if (j + 2 >= items.length) {
            return -1;
        }
        if (shouldPairImages(items[j].item, items[j + 1].item, j, config)) {
            return j + 1;
        }
        // A low-res image may look a few slots ahead for a low-res partner
        // instead of settling for whoever happens to sit next to it.
        if (!isLowResolution(items[j].item, config)) {
            return -1;
        }
        var limit = Math.min(j + 4, items.length - 2);
        var k;
        for (k = j + 2; k <= limit; k += 1) {
            if (isLowResolution(items[k].item, config)) {
                return k;
            }
        }
        return -1;
    }

    function isPortraitImage(item) {
        return item.height > item.width * 1.08;
    }

    function isLandscapeImage(item) {
        return item.width > item.height * 1.08;
    }

    function createSlideComp(spec, index, total, config, parentFolder) {
        spec.duration = quantizeTime(spec.duration, config.frameRate);
        var number = padNumber(index + 1, String(total).length);
        if (spec.type === "images" && spec.images.length === 1) {
            spec.treatment = chooseTreatment(
                spec.images[0].item,
                config,
                index,
                spec.forceHero === true
            );
            spec.warning = portraitCropWarning(
                spec.images[0].item,
                spec.treatment,
                config
            );
        }
        var label = spec.type === "section"
            ? "Section - " + spec.title
            : displayBaseName(spec.images[0].file);
        if (spec.type === "images" && spec.images.length === 2) {
            label += " + " + displayBaseName(spec.images[1].file);
        }
        if (spec.warning) {
            label = "CHECK PORTRAIT CROP - " + label;
        }

        var comp = app.project.items.addComp(
            uniqueProjectItemName(number + " - " + safeName(label)),
            config.width,
            config.height,
            1,
            spec.duration,
            config.frameRate
        );
        comp.parentFolder = parentFolder;
        comp.comment = SLIDE_TAG +
            (spec.warning ? "\nWARNING: " + spec.warning : "");
        if (spec.warning) {
            setWarningLabel(comp);
        }

        maxPhotoScale = 0;
        if (spec.type === "section") {
            createSectionCard(comp, spec.title, config);
        } else if (spec.images.length === 2) {
            createTwoUpSlide(comp, spec.images, index, config);
        } else {
            createSingleSlide(
                comp,
                spec.images[0],
                index,
                config,
                spec.treatment,
                spec.warning
            );
        }
        if (
            spec.type === "images" &&
            maxPhotoScale > ENLARGEMENT_WARNING_SCALE
        ) {
            var enlargementWarning =
                "Photo shown at about " + Math.round(maxPhotoScale) +
                "% of its original size; review sharpness or choose a " +
                "smaller treatment.";
            spec.warning = spec.warning
                ? spec.warning + " " + enlargementWarning
                : enlargementWarning;
            comp.name = uniqueProjectItemName(
                number + " - " + safeName("CHECK ENLARGEMENT - " + label)
            );
            comp.comment = SLIDE_TAG + "\nWARNING: " + spec.warning;
            setWarningLabel(comp);
        }
        return {
            comp: comp,
            duration: spec.duration,
            spec: spec,
            warning: spec.warning || null
        };
    }

    function createSectionCard(comp, title, config) {
        addBackground(comp, [0.055, 0.06, 0.07], "Background");
        var accent = addRectangle(
            comp,
            "Accent",
            [Math.round(config.width * 0.09), 6],
            [config.width / 2, config.height / 2 - 54],
            [0.72, 0.63, 0.46]
        );
        accent.property("ADBE Transform Group")
            .property("ADBE Opacity").setValue(80);

        var textLayer = comp.layers.addText(title);
        textLayer.name = "SECTION TITLE - edit text";
        var document = textLayer.property("ADBE Text Properties")
            .property("ADBE Text Document").value;
        document.fontSize = Math.max(34, Math.round(config.height * 0.055));
        document.fillColor = [0.93, 0.91, 0.87];
        document.justification = ParagraphJustification.CENTER_JUSTIFY;
        document.applyFill = true;
        document.applyStroke = false;
        textLayer.property("ADBE Text Properties")
            .property("ADBE Text Document").setValue(document);
        centerAnchor(textLayer, 0);
        textLayer.property("ADBE Transform Group")
            .property("ADBE Position")
            .setValue([config.width / 2, config.height / 2 + 28]);
        fadeLayerIn(textLayer, Math.min(0.6, comp.duration * 0.3));
    }

    function createSingleSlide(
        comp,
        image,
        slideIndex,
        config,
        treatment,
        warning
    ) {
        var recipe = resolveMotionRecipe(slideIndex, config);
        if (treatment === "Full Bleed") {
            var fullLayer = comp.layers.add(image.item);
            fullLayer.name =
                (warning ? "CHECK PORTRAIT CROP - " : "PHOTO - ") +
                displayFileName(image.file);
            if (warning) {
                fullLayer.comment = warning;
                setWarningLabel(fullLayer);
            }
            applyArchiveLook(fullLayer, config.look);
            recordPhotoScale(placeImage(
                fullLayer,
                [config.width / 2, config.height / 2],
                [config.width, config.height],
                "cover",
                null
            ));
            addCoverMotionOverscan(fullLayer, recipe, config.width);
            applyMotionRecipe(
                [fullLayer],
                comp.duration,
                recipe,
                config,
                true,
                slideIndex % 2 === 0 ? 1 : -1,
                config.width
            );
            addPhotoControls(fullLayer);
            return;
        }

        if (treatment === "Near Full") {
            var nearLayer = comp.layers.add(image.item);
            nearLayer.name = "PHOTO - " + displayFileName(image.file);
            applyArchiveLook(nearLayer, config.look);
            recordPhotoScale(placeImage(
                nearLayer,
                [config.width / 2, config.height / 2],
                [
                    Math.round(config.width * 0.94),
                    Math.round(config.height * 0.92)
                ],
                "contain",
                null
            ));
            applyMotionRecipe(
                [nearLayer],
                comp.duration,
                recipe,
                config,
                false,
                slideIndex % 2 === 0 ? 1 : -1,
                config.width
            );
            addPhotoControls(nearLayer);
            return;
        }

        if (treatment === "Soft Background") {
            addSoftBackground(comp, image.item, config);
        }

        var target = [
            Math.round(config.width * 0.82),
            Math.round(config.height * 0.82)
        ];
        var fitScale = fitScalePercent(image.item, target);
        var cappedScale = Math.min(fitScale, config.maxUpscale);
        var displayed = [
            image.item.width * cappedScale / 100,
            image.item.height * cappedScale / 100
        ];

        if (treatment === "Window Frame") {
            var frameSize = [
                Math.max(8, Math.round(displayed[0])),
                Math.max(8, Math.round(displayed[1]))
            ];
            addRectangle(
                comp,
                "Photo Matte",
                [
                    Math.round(frameSize[0] + config.width * 0.025),
                    Math.round(frameSize[1] + config.height * 0.045)
                ],
                [config.width / 2, config.height / 2],
                [0.92, 0.905, 0.87]
            );
            createPhotoWindow(
                comp,
                image,
                "PHOTO WINDOW",
                frameSize,
                [config.width / 2, config.height / 2],
                recipe,
                slideIndex % 2 === 0 ? 1 : -1,
                config
            );
            return;
        }

        var printMatte = null;
        if (treatment === "Print") {
            printMatte = addRectangle(
                comp,
                "Photo Matte",
                [
                    Math.round(displayed[0] + config.width * 0.028),
                    Math.round(displayed[1] + config.height * 0.052)
                ],
                [config.width / 2, config.height / 2],
                [0.92, 0.905, 0.87]
            );
        }

        var imageLayer = comp.layers.add(image.item);
        imageLayer.name = "PHOTO - " + displayFileName(image.file);
        applyArchiveLook(imageLayer, config.look);
        setTransform(
            imageLayer,
            [config.width / 2, config.height / 2],
            cappedScale
        );
        recordPhotoScale(cappedScale);

        var movingLayers = [imageLayer];
        if (treatment === "Print") {
            var rotation = slideIndex % 2 === 0 ? -1.2 : 1.2;
            printMatte.property("ADBE Transform Group")
                .property("ADBE Rotate Z").setValue(rotation);
            imageLayer.property("ADBE Transform Group")
                .property("ADBE Rotate Z").setValue(rotation);
            var printController = createMotionController(
                comp,
                "PRINT MOTION",
                [config.width / 2, config.height / 2]
            );
            printMatte.parent = printController;
            imageLayer.parent = printController;
            movingLayers = [printController];
        }
        applyMotionRecipe(
            movingLayers,
            comp.duration,
            recipe,
            config,
            false,
            slideIndex % 2 === 0 ? 1 : -1,
            config.width
        );
        if (treatment === "Print") {
            addPhotoControls(imageLayer, false);
            addMotionAmountControl(printController);
        } else {
            addPhotoControls(imageLayer, true);
        }
    }

    function chooseTreatment(item, config, slideIndex, forceHero) {
        if (config.treatment !== "Auto Mix") {
            return config.treatment;
        }

        var coverScale = Math.max(
            config.width / item.width,
            config.height / item.height
        ) * 100;
        var sourceAspect = item.width / item.height;
        var canvasAspect = config.width / config.height;
        var retained = Math.min(
            sourceAspect / canvasAspect,
            canvasAspect / sourceAspect
        );
        var nearScale = fitScalePercent(
            item,
            [config.width * 0.94, config.height * 0.92]
        );

        var canFullBleed =
            coverScale <= config.maxUpscale * 1.2 && retained >= 0.55;
        var canNearFull = nearScale <= config.maxUpscale * 1.15;

        // Fallback pool for images that cannot go full bleed: the
        // "use sparingly" single treatments, rotated evenly so none of them
        // dominates. Contained stays out of automatic selection entirely.
        var fallback = ["Soft Background", "Window Frame", "Print"];
        var pick = fallback[slideIndex % fallback.length];
        // Near Full is the barest of the fallbacks; use it only occasionally,
        // and only when the image fits without enlargement.
        if (canNearFull && slideIndex % 5 === 4) {
            pick = "Near Full";
        }

        if (forceHero) {
            if (coverScale <= config.maxUpscale * 1.2) {
                return "Full Bleed";
            }
            return canNearFull ? "Near Full" : pick;
        }

        if (isPortraitImage(item)) {
            // Portraits would need a bad crop to fill the frame, so they stay
            // in the protected fallback rotation.
            return pick;
        }

        // Landscape and square images favor Full Bleed, the only strong
        // single-image layout, most of the time, dropping to a sparingly
        // treatment now and then for rhythm.
        if (canFullBleed && slideIndex % 4 !== 3) {
            return "Full Bleed";
        }
        return pick;
    }

    function portraitCropWarning(item, treatment, config) {
        if (
            config.treatment === "Full Bleed" &&
            treatment === "Full Bleed" &&
            isPortraitImage(item)
        ) {
            return (
                "Portrait image forced to Full Bleed; inspect crop and " +
                "reposition or change treatment."
            );
        }
        return null;
    }

    function resolveTwoUpStyle(slideIndex, config) {
        if (config.multiStyle !== "Auto Mix") {
            return config.multiStyle;
        }
        // Strong pair styles (Hero + Support, Offset Pair, Edge to Edge) each
        // appear three times per cycle; the sparingly styles (Window Frame,
        // Prints, Clean) appear once each.
        var styles = [
            "Hero + Support",
            "Offset Pair",
            "Edge to Edge",
            "Hero + Support",
            "Offset Pair",
            "Edge to Edge",
            "Window Frame",
            "Hero + Support",
            "Offset Pair",
            "Edge to Edge",
            "Prints",
            "Clean"
        ];
        return styles[slideIndex % styles.length];
    }

    function addSoftBackground(comp, item, config) {
        addBackground(comp, SOFT_BG_WASH_COLOR, "Background");
        var layer = comp.layers.add(item);
        layer.name = "SOFT BACKGROUND";
        applyArchiveLook(layer, config.look);
        placeImage(
            layer,
            [config.width / 2, config.height / 2],
            [config.width, config.height],
            "cover",
            null
        );
        layer.property("ADBE Transform Group")
            .property("ADBE Opacity").setValue(50);
        try {
            var blur = layer.property("ADBE Effect Parade")
                .addProperty("ADBE Gaussian Blur 2");
            blur.property("ADBE Gaussian Blur 2-0001").setValue(120);
            blur.property("ADBE Gaussian Blur 2-0003").setValue(true);
        } catch (error) {
            // The layout remains useful if the localized AE build lacks this effect.
        }

        // A deep blue wash sits over the blurred echo (and under the sharp
        // foreground photo added next) so the background reads as a deliberate
        // color field instead of a plain blurred duplicate.
        var wash = comp.layers.addSolid(
            SOFT_BG_WASH_COLOR,
            "COLOR WASH",
            comp.width,
            comp.height,
            1,
            comp.duration
        );
        wash.property("ADBE Transform Group")
            .property("ADBE Opacity").setValue(45);
    }

    function createTwoUpSlide(comp, images, slideIndex, config) {
        var style = resolveTwoUpStyle(slideIndex, config);
        var recipe = resolveMotionRecipe(slideIndex, config);
        var landscape = config.width >= config.height;
        var gap = style === "Edge to Edge"
            ? 0
            : Math.round(Math.min(config.width, config.height) * 0.035);
        var cellWidth = landscape
            ? Math.round((config.width - gap * 3) / 2)
            : Math.round(config.width - gap * 2);
        var cellHeight = landscape
            ? Math.round(config.height - gap * 2)
            : Math.round((config.height - gap * 3) / 2);
        var centers = landscape
            ? [
                [gap + cellWidth / 2, config.height / 2],
                [gap * 2 + cellWidth + cellWidth / 2, config.height / 2]
            ]
            : [
                [config.width / 2, gap + cellHeight / 2],
                [config.width / 2, gap * 2 + cellHeight + cellHeight / 2]
            ];

        if (style === "Hero + Support" || style === "Offset Pair") {
            createAsymmetricTwoUp(
                comp,
                images,
                slideIndex,
                style,
                recipe,
                config
            );
            return;
        }

        var i;

        for (i = 0; i < images.length; i += 1) {
            var motionDirection = i === 0 ? 1 : -1;
            if (style === "Edge to Edge") {
                var edgeSize = landscape
                    ? [Math.ceil(config.width / 2), config.height]
                    : [config.width, Math.ceil(config.height / 2)];
                var edgeCenter = landscape
                    ? [
                        i === 0 ? edgeSize[0] / 2 : config.width - edgeSize[0] / 2,
                        config.height / 2
                    ]
                    : [
                        config.width / 2,
                        i === 0
                            ? edgeSize[1] / 2
                            : config.height - edgeSize[1] / 2
                    ];
                createPhotoWindow(
                    comp,
                    images[i],
                    "EDGE PHOTO " + (i + 1),
                    edgeSize,
                    edgeCenter,
                    recipe,
                    motionDirection,
                    config
                );
                continue;
            }

            var target = [
                Math.round(cellWidth * 0.92),
                Math.round(cellHeight * 0.92)
            ];
            var fitScale = Math.min(
                fitScalePercent(images[i].item, target),
                config.maxUpscale
            );
            var displayed = [
                images[i].item.width * fitScale / 100,
                images[i].item.height * fitScale / 100
            ];

            if (style === "Window Frame") {
                var windowSize = [
                    Math.max(8, Math.round(cellWidth * 0.88)),
                    Math.max(8, Math.round(cellHeight * 0.88))
                ];
                addRectangle(
                    comp,
                    "Photo Matte " + (i + 1),
                    [
                        Math.round(windowSize[0] + gap * 0.5),
                        Math.round(windowSize[1] + gap * 0.65)
                    ],
                    centers[i],
                    [0.91, 0.90, 0.87]
                );
                createPhotoWindow(
                    comp,
                    images[i],
                    "PHOTO WINDOW " + (i + 1),
                    windowSize,
                    centers[i],
                    recipe,
                    motionDirection,
                    config
                );
                continue;
            }

            var matteLayer = null;
            if (style === "Prints") {
                matteLayer = addRectangle(
                    comp,
                    "Photo Matte " + (i + 1),
                    [
                        Math.round(displayed[0] + gap * 0.55),
                        Math.round(displayed[1] + gap * 0.72)
                    ],
                    centers[i],
                    [0.91, 0.90, 0.87]
                );
            }
            var layer = comp.layers.add(images[i].item);
            layer.name = "PHOTO " + (i + 1) + " - " +
                displayFileName(images[i].file);
            applyArchiveLook(layer, config.look);
            setTransform(layer, centers[i], fitScale);
            recordPhotoScale(fitScale);

            var movingLayers = matteLayer === null
                ? [layer]
                : [matteLayer, layer];
            if (style === "Prints") {
                var rotation = i === 0 ? -1 : 1;
                matteLayer.property("ADBE Transform Group")
                    .property("ADBE Rotate Z").setValue(rotation);
                layer.property("ADBE Transform Group")
                    .property("ADBE Rotate Z").setValue(rotation);
                var printController = createMotionController(
                    comp,
                    "PRINT MOTION " + (i + 1),
                    centers[i]
                );
                matteLayer.parent = printController;
                layer.parent = printController;
                movingLayers = [printController];
            }
            applyMotionRecipe(
                movingLayers,
                comp.duration,
                recipe,
                config,
                false,
                motionDirection,
                cellWidth
            );
            if (style === "Prints") {
                addPhotoControls(layer, false);
                addMotionAmountControl(printController);
            } else {
                addPhotoControls(layer, true);
            }
        }

        if (style === "Edge to Edge") {
            // Added last so the rule sits on top of both photo windows.
            addEdgeToEdgeRule(comp, landscape, config);
        }
    }

    function addEdgeToEdgeRule(comp, landscape, config) {
        var thickness = Math.max(
            2,
            Math.round(Math.min(config.width, config.height) * 0.002)
        );
        var size = landscape
            ? [thickness, config.height]
            : [config.width, thickness];
        return addRectangle(
            comp,
            "CENTER RULE",
            size,
            [config.width / 2, config.height / 2],
            EDGE_RULE_COLOR
        );
    }

    function createAsymmetricTwoUp(
        comp,
        images,
        slideIndex,
        style,
        recipe,
        config
    ) {
        var landscape = config.width >= config.height;
        var boxes;
        if (style === "Hero + Support" && landscape) {
            boxes = [
                {
                    size: [config.width * 0.58, config.height * 0.78],
                    position: [config.width * 0.34, config.height * 0.5]
                },
                {
                    size: [config.width * 0.27, config.height * 0.48],
                    position: [config.width * 0.79, config.height * 0.56]
                }
            ];
        } else if (style === "Hero + Support") {
            boxes = [
                {
                    size: [config.width * 0.78, config.height * 0.56],
                    position: [config.width * 0.5, config.height * 0.34]
                },
                {
                    size: [config.width * 0.48, config.height * 0.27],
                    position: [config.width * 0.58, config.height * 0.79]
                }
            ];
        } else if (landscape) {
            boxes = [
                {
                    size: [config.width * 0.41, config.height * 0.66],
                    position: [config.width * 0.29, config.height * 0.43]
                },
                {
                    size: [config.width * 0.37, config.height * 0.58],
                    position: [config.width * 0.72, config.height * 0.59]
                }
            ];
        } else {
            boxes = [
                {
                    size: [config.width * 0.68, config.height * 0.38],
                    position: [config.width * 0.43, config.height * 0.29]
                },
                {
                    size: [config.width * 0.60, config.height * 0.35],
                    position: [config.width * 0.58, config.height * 0.72]
                }
            ];
        }

        var border = Math.round(Math.min(config.width, config.height) * 0.025);
        var i;
        for (i = 0; i < 2; i += 1) {
            var size = [
                Math.max(8, Math.round(boxes[i].size[0])),
                Math.max(8, Math.round(boxes[i].size[1]))
            ];
            addRectangle(
                comp,
                "Photo Matte " + (i + 1),
                [size[0] + border, size[1] + border],
                boxes[i].position,
                [0.91, 0.90, 0.87]
            );
            createPhotoWindow(
                comp,
                images[i],
                style.toUpperCase() + " " + (i + 1),
                size,
                boxes[i].position,
                recipe,
                i === 0 ? 1 : -1,
                config
            );
        }
    }

    function createPhotoWindow(
        parentComp,
        image,
        name,
        size,
        position,
        recipe,
        direction,
        config
    ) {
        var width = Math.max(8, Math.round(size[0]));
        var height = Math.max(8, Math.round(size[1]));
        var windowComp = app.project.items.addComp(
            uniqueProjectItemName(parentComp.name + " - " + name),
            width,
            height,
            1,
            parentComp.duration,
            config.frameRate
        );
        windowComp.parentFolder = parentComp.parentFolder;
        windowComp.comment = SLIDE_TAG + " Photo Window";

        var imageLayer = windowComp.layers.add(image.item);
        imageLayer.name = "PHOTO - " + displayFileName(image.file);
        applyArchiveLook(imageLayer, config.look);
        var scale = Math.max(
            width / image.item.width,
            height / image.item.height
        ) * 100;
        setTransform(imageLayer, [width / 2, height / 2], scale);
        recordPhotoScale(scale);
        addCoverMotionOverscan(imageLayer, recipe, width);
        applyMotionRecipe(
            [imageLayer],
            windowComp.duration,
            recipe,
            config,
            true,
            direction,
            width
        );
        addPhotoControls(imageLayer);

        var windowLayer = parentComp.layers.add(windowComp);
        windowLayer.name = name + " - " + displayFileName(image.file);
        windowLayer.property("ADBE Transform Group")
            .property("ADBE Position").setValue(position);
        return windowLayer;
    }

    function addBackground(comp, color, name) {
        var layer = comp.layers.addSolid(
            color,
            name,
            comp.width,
            comp.height,
            1,
            comp.duration
        );
        layer.moveToEnd();
        return layer;
    }

    function addMasterBackground(master) {
        // Vignette goes in first and is pushed to the bottom so it sits just
        // above the base color and below every slide. The base color is moved
        // to the end last so it is the very bottom layer of the comp.
        try {
            var vignette = master.layers.addSolid(
                [0, 0, 0],
                "MASTER VIGNETTE",
                master.width,
                master.height,
                1,
                master.duration
            );
            var mask = vignette.property("ADBE Mask Parade")
                .addProperty("ADBE Mask Atom");
            var cx = master.width / 2;
            var cy = master.height / 2;
            var rx = master.width * 0.62;
            var ry = master.height * 0.62;
            var kx = rx * 0.5523;
            var ky = ry * 0.5523;
            var shape = new Shape();
            shape.closed = true;
            shape.vertices = [
                [cx, cy - ry],
                [cx + rx, cy],
                [cx, cy + ry],
                [cx - rx, cy]
            ];
            shape.inTangents = [
                [-kx, 0],
                [0, -ky],
                [kx, 0],
                [0, ky]
            ];
            shape.outTangents = [
                [kx, 0],
                [0, ky],
                [-kx, 0],
                [0, -ky]
            ];
            mask.property("ADBE Mask Shape").setValue(shape);
            mask.maskMode = MaskMode.SUBTRACT;
            var feather = Math.round(
                Math.min(master.width, master.height) * 0.25
            );
            mask.property("ADBE Mask Feather").setValue([feather, feather]);
            mask.property("ADBE Mask Opacity").setValue(45);
            vignette.moveToEnd();
        } catch (error) {
            // The vignette is a refinement; the flat base color below still
            // applies if masks behave differently in this AE build.
        }

        var background = master.layers.addSolid(
            MASTER_BG_COLOR,
            "MASTER BACKGROUND",
            master.width,
            master.height,
            1,
            master.duration
        );
        background.moveToEnd();
        return background;
    }

    function createMotionController(comp, name, position) {
        var controller = comp.layers.addNull();
        controller.name = name;
        controller.property("ADBE Transform Group")
            .property("ADBE Position").setValue(position);
        return controller;
    }

    function addRectangle(comp, name, size, position, color) {
        var layer = comp.layers.addShape();
        layer.name = name;
        var contents = layer.property("ADBE Root Vectors Group");
        var group = contents.addProperty("ADBE Vector Group");
        group.name = name;
        var groupContents = group.property("ADBE Vectors Group");
        var rectangle = groupContents.addProperty("ADBE Vector Shape - Rect");
        rectangle.property("ADBE Vector Rect Size").setValue(size);
        var fill = groupContents.addProperty("ADBE Vector Graphic - Fill");
        fill.property("ADBE Vector Fill Color").setValue(color);
        layer.property("ADBE Transform Group")
            .property("ADBE Position").setValue(position);
        return layer;
    }

    function placeImage(layer, position, target, mode, maxScale) {
        var item = layer.source;
        var scale = mode === "cover"
            ? Math.max(target[0] / item.width, target[1] / item.height) * 100
            : fitScalePercent(item, target);
        if (maxScale !== null) {
            scale = Math.min(scale, maxScale);
        }
        setTransform(layer, position, scale);
        return scale;
    }

    function recordPhotoScale(scale) {
        if (scale > maxPhotoScale) {
            maxPhotoScale = scale;
        }
    }

    function fitScalePercent(item, target) {
        return Math.min(
            target[0] / item.width,
            target[1] / item.height
        ) * 100;
    }

    function setTransform(layer, position, scale) {
        var transform = layer.property("ADBE Transform Group");
        transform.property("ADBE Position").setValue(position);
        transform.property("ADBE Scale").setValue([scale, scale]);
    }

    function resolveMotionRecipe(index, config) {
        if (config.motion !== "Cycle") {
            return config.motion;
        }
        // Push-weighted rotation: push appears in four of five slots so the
        // motion reads calm and intentional rather than constantly drifting.
        var recipes = [
            "Gentle Push",
            "Push + Drift",
            "Gentle Push",
            "Gentle Drift",
            "Push + Drift"
        ];
        return recipes[index % recipes.length];
    }

    function applyMotionRecipe(
        layers,
        duration,
        recipe,
        config,
        isCover,
        direction,
        motionWidth
    ) {
        if (recipe === "Still" || duration <= 0) {
            return;
        }

        if (recipe === "Gentle Push" || recipe === "Push + Drift") {
            var amount = isCover ? 1.045 : 1.025;
            var i;
            for (i = 0; i < layers.length; i += 1) {
                var scale = layers[i].property("ADBE Transform Group")
                    .property("ADBE Scale");
                var startScale = scale.value;
                scale.setValueAtTime(0, startScale);
                scale.setValueAtTime(
                    duration,
                    [startScale[0] * amount, startScale[1] * amount]
                );
                easeTwoKeyframes(scale);
            }
        }

        if (recipe === "Gentle Drift" || recipe === "Push + Drift") {
            var distance = motionDistance(motionWidth || config.width);
            var j;
            for (j = 0; j < layers.length; j += 1) {
                var position = layers[j].property("ADBE Transform Group")
                    .property("ADBE Position");
                var start = position.value;
                position.setValueAtTime(
                    0,
                    [start[0] - distance * direction, start[1]]
                );
                position.setValueAtTime(
                    duration,
                    [start[0] + distance * direction, start[1]]
                );
                easeTwoKeyframes(position);
            }
        }
    }

    function motionDistance(width) {
        // Drift travel, trimmed ~20% from the original for a subtler move.
        return Math.max(6, Math.min(22, width * 0.016));
    }

    function addCoverMotionOverscan(layer, recipe, width) {
        if (recipe !== "Gentle Drift" && recipe !== "Push + Drift") {
            return;
        }
        var scale = layer.property("ADBE Transform Group")
            .property("ADBE Scale");
        var value = scale.value;
        var amount = 1 + (motionDistance(width) * 2 / width) + 0.025;
        scale.setValue([value[0] * amount, value[1] * amount]);
    }

    function addPhotoControls(layer, includeMotion) {
        addSliderControl(layer, "Reframe X", 0);
        addSliderControl(layer, "Reframe Y", 0);
        addSliderControl(layer, "Zoom", 100);
        if (includeMotion !== false) {
            addSliderControl(layer, "Motion Amount", 100);
        }

        var transform = layer.property("ADBE Transform Group");
        var positionExpression =
            "var x = effect(\"Reframe X\")(1);\n" +
            "var y = effect(\"Reframe Y\")(1);\n";
        var scaleExpression = "var z = effect(\"Zoom\")(1) / 100;\n";
        if (includeMotion !== false) {
            positionExpression += motionAmountExpression("p") +
                "\np + [x, y];";
            scaleExpression += motionAmountExpression("s") + "\ns * z;";
        } else {
            positionExpression += "value + [x, y];";
            scaleExpression += "value * z;";
        }
        transform.property("ADBE Position").expression = positionExpression;
        transform.property("ADBE Scale").expression = scaleExpression;
    }

    function addMotionAmountControl(layer) {
        addSliderControl(layer, "Motion Amount", 100);
        var transform = layer.property("ADBE Transform Group");
        transform.property("ADBE Position").expression =
            motionAmountExpression("p") + "\np;";
        transform.property("ADBE Scale").expression =
            motionAmountExpression("s") + "\ns;";
    }

    function motionAmountExpression(variableName) {
        return (
            "var m = effect(\"Motion Amount\")(1) / 100;\n" +
            "var " + variableName + " = value;\n" +
            "if (numKeys > 1) {\n" +
            "  var a = key(1).value;\n" +
            "  var b = key(numKeys).value;\n" +
            "  var c = (a + b) / 2;\n" +
            "  " + variableName + " = c + (value - c) * m;\n" +
            "}"
        );
    }

    function addSliderControl(layer, name, value) {
        var effect = layer.property("ADBE Effect Parade")
            .addProperty("ADBE Slider Control");
        effect.name = name;
        effect.property("ADBE Slider Control-0001").setValue(value);
        return effect;
    }

    function applyArchiveLook(layer, look) {
        if (look === "Off") {
            return;
        }
        try {
            var tint = layer.property("ADBE Effect Parade")
                .addProperty("ADBE Tint");
            tint.name = look === "Monochrome"
                ? "Archive Look - Monochrome"
                : "Archive Look - Faded";
            if (look === "Monochrome") {
                tint.property(1).setValue([0.035, 0.035, 0.035]);
                tint.property(2).setValue([0.94, 0.93, 0.90]);
                tint.property(3).setValue(100);
            } else {
                tint.property(1).setValue([0.10, 0.075, 0.055]);
                tint.property(2).setValue([0.95, 0.88, 0.72]);
                tint.property(3).setValue(38);
            }
        } catch (error) {
            // Keep generation working if Tint is unavailable in this AE build.
        }
    }

    function easeTwoKeyframes(property) {
        if (property.numKeys !== 2) {
            return;
        }
        try {
            var ease = new KeyframeEase(0, 40);
            // Spatial properties take one ease; other multi-dimensional
            // properties need one ease per dimension or AE throws.
            var dimensions = 1;
            if (!property.isSpatial && property.value instanceof Array) {
                dimensions = property.value.length;
            }
            var eases = [];
            var i;
            for (i = 0; i < dimensions; i += 1) {
                eases.push(ease);
            }
            property.setTemporalEaseAtKey(1, eases, eases);
            property.setTemporalEaseAtKey(2, eases, eases);
        } catch (error) {
            // Easing is a nicety; keep building if a property rejects it.
        }
    }

    function fadeLayerIn(layer, duration) {
        var opacity = layer.property("ADBE Transform Group")
            .property("ADBE Opacity");
        opacity.setValueAtTime(0, 0);
        opacity.setValueAtTime(duration, 100);
        easeTwoKeyframes(opacity);
    }

    function centerAnchor(layer, time) {
        var bounds = layer.sourceRectAtTime(time, false);
        layer.property("ADBE Transform Group")
            .property("ADBE Anchor Point")
            .setValue([
                bounds.left + bounds.width / 2,
                bounds.top + bounds.height / 2
            ]);
    }

    function makeSchedule(slides, config) {
        var starts = [0];
        var transitions = [];
        var i;
        for (i = 1; i < slides.length; i += 1) {
            var style = config.transitions[(i - 1) % config.transitions.length];
            var overlap = style === "Cut"
                ? 0
                : Math.min(
                    config.transitionDuration,
                    slides[i - 1].duration * 0.45,
                    slides[i].duration * 0.45
                );
            // Keep every boundary on the frame grid so cuts cannot leave a
            // one-frame gap or overlap at fractional frame rates.
            overlap = Math.round(overlap * config.frameRate) /
                config.frameRate;
            transitions.push({ style: style, duration: overlap });
            var start = starts[i - 1] + slides[i - 1].duration - overlap;
            starts.push(
                Math.round(start * config.frameRate) / config.frameRate
            );
        }
        return {
            starts: starts,
            transitions: transitions,
            duration: starts[starts.length - 1] +
                slides[slides.length - 1].duration
        };
    }

    function assembleMaster(master, slides, schedule, config) {
        var layers = [];
        var i;
        for (i = 0; i < slides.length; i += 1) {
            var layer = master.layers.add(slides[i].comp);
            layer.name = slides[i].comp.name;
            layer.startTime = schedule.starts[i];
            layer.inPoint = schedule.starts[i];
            layer.outPoint = schedule.starts[i] + slides[i].duration;
            if (slides[i].warning) {
                layer.comment = slides[i].warning;
                setWarningLabel(layer);
            }
            layers.push(layer);
        }

        for (i = 0; i < schedule.transitions.length; i += 1) {
            applyTransition(
                layers[i],
                layers[i + 1],
                schedule.starts[i + 1],
                schedule.transitions[i],
                config
            );
        }
    }

    function applyTransition(outgoing, incoming, start, transition, config) {
        if (transition.style === "Cut" || transition.duration <= 0) {
            return;
        }
        var end = start + transition.duration;
        if (transition.style === "Dissolve") {
            animateOpacity(outgoing, start, end, 100, 0);
            animateOpacity(incoming, start, end, 0, 100);
        } else if (transition.style === "Push") {
            var outPosition = outgoing.property("ADBE Transform Group")
                .property("ADBE Position");
            var inPosition = incoming.property("ADBE Transform Group")
                .property("ADBE Position");
            outPosition.setValueAtTime(
                start,
                [config.width / 2, config.height / 2]
            );
            outPosition.setValueAtTime(
                end,
                [-config.width / 2, config.height / 2]
            );
            inPosition.setValueAtTime(
                start,
                [config.width * 1.5, config.height / 2]
            );
            inPosition.setValueAtTime(
                end,
                [config.width / 2, config.height / 2]
            );
            easeTwoKeyframes(outPosition);
            easeTwoKeyframes(inPosition);
        }
    }

    function animateOpacity(layer, start, end, fromValue, toValue) {
        var opacity = layer.property("ADBE Transform Group")
            .property("ADBE Opacity");
        opacity.setValueAtTime(start, fromValue);
        opacity.setValueAtTime(end, toValue);
        if (opacity.numKeys === 2) {
            easeTwoKeyframes(opacity);
        }
    }

    function displayBaseName(file) {
        return cleanDisplayName(
            displayFileName(file).replace(/\.[^.]+$/, "")
        );
    }

    function quantizeTime(time, frameRate) {
        var frames = Math.round(time * frameRate);
        return Math.max(1, frames) / frameRate;
    }

    function countSlideWarnings(slides) {
        var count = 0;
        var i;
        for (i = 0; i < slides.length; i += 1) {
            if (slides[i].warning) {
                count += 1;
            }
        }
        return count;
    }

    function setWarningLabel(item) {
        try {
            item.label = 2;
        } catch (error) {
            // Label colors are a convenience and can vary by AE version.
        }
    }

    function safeName(text) {
        var output = String(text).replace(/[\\\/:*?"<>|]/g, "-");
        output = output.replace(/^\s+|\s+$/g, "");
        return output === "" ? "Archive" : output;
    }

    function resetProjectNameCache() {
        projectNameCache = {};
        var i;
        for (i = 1; i <= app.project.numItems; i += 1) {
            projectNameCache[app.project.item(i).name] = true;
        }
    }

    function uniqueProjectItemName(desired) {
        if (projectNameCache === null) {
            resetProjectNameCache();
        }
        var name = desired;
        var suffix = 2;
        while (projectNameCache[name] === true) {
            name = desired + " " + suffix;
            suffix += 1;
        }
        projectNameCache[name] = true;
        return name;
    }

    function padNumber(value, width) {
        var text = String(value);
        while (text.length < width) {
            text = "0" + text;
        }
        return text;
    }

    var panel = buildUI(thisObj);
    if (panel instanceof Window) {
        panel.center();
        panel.show();
    }
})(this);
