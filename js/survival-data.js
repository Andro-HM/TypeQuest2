// Survival rules and editable passages from the existing game.
const survivalData =
{
    countdownMilliseconds: 3000,
    windowCharacters: 60,
    startingHalfHearts: 6,
    startingSpeed: 1.5,
    speedIncreasePerMinute: 0.5,
    maximumSpeed: 4,
    tierMilliseconds: 60000,
    startingDamageThreshold: 6,
    tiers:
    [
        {
            number: 1,
            passages:
            [
                "The morning sun warmed the path. A small bird hopped beside the garden gate.",
                "Mina placed a cup on the table. She poured cool water and sat by the window.",
                "A blue bus stopped near the park. Three friends climbed aboard with their bags.",
                "The baker opened his shop early. Fresh rolls filled the room with a warm smell.",
                "Rain tapped softly on the roof. Nila closed her book and watched the street.",
                "A dog slept under the old bench. Its ears moved when the children walked past.",
                "The train crossed a green field. From the window, Ravi saw a line of trees.",
                "Two lamps lit the quiet room. Sara found her pencil and began a new drawing.",
                "The shop sold red apples and yellow pears. Each basket had a neat paper sign.",
                "A boat moved slowly across the lake. Its white sail shone in the afternoon sun.",
                "Kiran swept the front steps. He left a clean place for the guests to sit.",
                "The library clock struck noon. A reader returned a book and chose another one.",
                "A child planted a bean in a pot. Each day, she checked for a new green leaf.",
                "The market lane was busy. A seller tied flowers with a piece of brown string.",
                "Omar fixed the loose wheel on his cart. It rolled well on the next trip.",
                "The moon rose above the houses. A cat watched it from a warm stone wall.",
                "Leena put fresh paper in the printer. The class notes came out clear and neat.",
                "A gentle wind moved the tall grass. The path to the river was easy to follow.",
                "The team shared a large map. They found the bridge and marked a safe route.",
                "At dusk, the street lights came on. Families walked home after the fair."
            ]
        },
        {
            number: 2,
            passages:
            [
                "The museum guide lifted a small wooden box, then asked visitors to guess what it once held.",
                "After the storm, neighbors checked the narrow lane and cleared leaves from its drains.",
                "Priya wrote a list of tools before the repair, so nobody had to search during the work.",
                "A sign at the station showed the new platform number; travelers paused to read it twice.",
                "The school garden grew mint, beans, and flowers. Each bed had a label beside its path.",
                "Dev tested the kite in a light breeze, but its tail needed one more careful knot.",
                "The ferry arrived late because the river was high. Its captain explained the delay calmly.",
                "Mira found two similar keys in a drawer; only one could open the old storage room.",
                "At the workshop, students measured each board before they cut it to fit the frame.",
                "A note on the door said the hall was closed today, but the side room remained open.",
                "The book cart visited on Friday. New readers learned its stops from a simple printed map.",
                "Nia checked the soil in both pots; the one near the wall needed less water.",
                "The clock ran slowly after lunch, so its owner recorded the time and watched it again.",
                "A group painted the park bench blue and waited until the next morning to use it.",
                "The first recipe was too sweet. Tara used less sugar when she baked the second batch.",
                "A runner stopped at the fountain, filled her bottle, and thanked the volunteer nearby.",
                "The town notice listed three meeting times. Farah circled the one she could attend.",
                "Clouds hid the stars at first, yet the sky cleared before the telescope was packed away.",
                "Two teams compared their paper bridges and wrote down which folds held the most coins.",
                "The visitor desk kept a spare umbrella for anyone caught by a sudden shower."
            ]
        },
        {
            number: 3,
            passages:
            [
                "The archive labeled each photograph with a date, a place, and the name of its donor.",
                "A minor change in the river's course made the old survey map harder to interpret.",
                "The committee tested two routes, compared their travel times, and chose the safer crossing.",
                "When the first reading seemed unusual, Amita repeated the measurement before recording it.",
                "The lantern maker kept a sketch of every design, including those that failed to balance.",
                "At the rehearsal, one misplaced cue changed the scene; the stage crew corrected its timing.",
                "A volunteer counted the borrowed tools and noticed that the drill had not yet returned.",
                "The weather club moved its wind vane beyond the wall to obtain a clearer reading.",
                "Ezra revised the schedule after two families missed the cart's final Friday stop.",
                "A careful label can distinguish an observed fact from a reasonable but uncertain guess.",
                "The glasshouse team recorded temperature at dawn, noon, and dusk for an entire week.",
                "Noor kept both dates on the letter; the writer had continued after midnight.",
                "A second estimate included anchors and repairs that the first estimate had omitted.",
                "The survey followed the path people actually used, not the straight line on an old plan.",
                "Because the workshop was noisy, the team practiced clear signals before starting work.",
                "The guide marked each trail junction and asked the last walker to stay within sight.",
                "A bright chart showed the experiment's average result as well as its unusual trial.",
                "The post office changed its notice after residents described where they had become lost.",
                "The organizer left room for slower walkers and checked that the ramp was clear.",
                "Their final report explained the method, the limits, and what the group would test next."
            ]
        },
        {
            number: 4,
            passages:
            [
                "An inventory is useful only when its dates and locations can be checked against the items themselves.",
                "The canal team postponed its repair until daylight; fragile stones near the bank required care.",
                "A street can change its purpose long before an official map changes the name printed beside it.",
                "The thermometer near the roof gave a higher reading than the one beside the shaded table.",
                "Instead of declaring the bowl a cooking vessel, the exhibit described what had actually been found.",
                "During the drill, a delivery cart blocked half the corridor; the leader recorded the hazard.",
                "Both sides of the letter were scanned in order, preserving the change in ink after midnight.",
                "The cheapest estimate omitted an important fitting, so the students compared complete costs.",
                "Footmarks curved around the orchard's low ground, which flooded after heavy rain.",
                "One hand signal resembled a casual wave; the team replaced it before the machines started.",
                "A catalog entry should distinguish a draft map from the polished drawing prepared months later.",
                "The committee asked the builders identical questions about materials, weather, and maintenance.",
                "When the sign was hidden from one approach, the organizers tested the junction on bicycles.",
                "The printer checked a color proof under daylight and lamps before changing the design.",
                "Separate notes about fruit sold and fruit donated made the orchard ledger more reliable.",
                "The bridge report listed one adjustment alongside the successful load tests; both details mattered.",
                "A sensor recorded steady measurements while the wall clock skipped an hour during the time change.",
                "Three memories of the same storm differed, so Rosa checked notices before writing the timeline.",
                "The spare valve carried a different pressure rating, despite looking identical on the shelf.",
                "Counts taken at several hours helped the council judge when the square was busiest."
            ]
        },
        {
            number: 5,
            passages:
            [
                "A timestamp can be precise and still be misleading if its clock follows a different convention.",
                "Before opening the footbridge, inspectors verified the predicted bend and the railing's height.",
                "Conflicting recollections do not automatically make witnesses careless; perspective shapes memory.",
                "The ferry's delay was inconvenient, but installing an unverified spare would have been reckless.",
                "A temporary loading lane let the council test its compromise before making the change permanent.",
                "Draft and final maps belonged in separate archive boxes, with a cross-reference linking them.",
                "The shelter coordinator documented the family's request without promising a response from the clinic.",
                "Paper stock altered the printed orange, so a narrow test strip saved another full poster run.",
                "Common units made the three harvest ledgers comparable; uncertain dates remained marked as such.",
                "The route was checked at riding speed, revealing a sign that was hidden by leaves.",
                "A robust procedure states who records each observation, when it is checked, and how exceptions are handled.",
                "The council's first proposal sounded simple; its effects differed sharply between morning and evening.",
                "A carefully worded museum label can present evidence without pretending that uncertainty has vanished.",
                "After comparing the duplicate records, Zoya preserved both versions and explained their sequence.",
                "The forecast changed overnight; the team revised its route instead of defending yesterday's plan.",
                "One anomalous trial deserved an explanation, not deletion from the experiment's final table.",
                "When the lens failed, the volunteers checked its mount and notes before ordering a replacement.",
                "A reliable inventory records not merely what is absent, but where a borrowed item went.",
                "The team distinguished what the sensor measured from what the chart's labels implied.",
                "Their final review listed successes, unresolved questions, and the next checks in clear order."
            ]
        }
    ]
};
