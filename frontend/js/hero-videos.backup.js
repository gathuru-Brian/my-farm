/* =========================================================
   MODERN FARMS
   HERO VIDEO ROTATION
========================================================= */

"use strict";


document.addEventListener(
    "DOMContentLoaded",
    initializeHeroVideos
);


function initializeHeroVideos() {

    const videos = Array.from(
        document.querySelectorAll(".hero-video")
    );


    if (!videos.length) {
        return;
    }


    let currentIndex = 0;


    /*
    =========================================================
    INITIALIZE VIDEOS
    =========================================================
    */

    videos.forEach((video, index) => {

        video.muted = true;

        video.playsInline = true;

        video.preload = "auto";


        if (index !== 0) {

            video.pause();

            video.currentTime = 0;

        }

    });


    /*
    =========================================================
    START FIRST VIDEO
    =========================================================
    */

    playVideo(videos[currentIndex]);


    /*
    =========================================================
    VIDEO ENDED EVENT
    =========================================================
    */

    videos.forEach((video, index) => {

        video.addEventListener(
            "ended",
            () => {

                if (index === currentIndex) {

                    showNextVideo();

                }

            }
        );

    });


    /*
    =========================================================
    NEXT VIDEO
    =========================================================
    */

    function showNextVideo() {

        const previousVideo =
            videos[currentIndex];


        currentIndex =
            (currentIndex + 1) % videos.length;


        const nextVideo =
            videos[currentIndex];


        /*
        Remove active state
        */

        previousVideo.classList.remove("active");


        /*
        Prepare next video
        */

        nextVideo.currentTime = 0;

        nextVideo.classList.add("active");


        /*
        Start next video
        */

        playVideo(nextVideo);

    }


    /*
    =========================================================
    PLAY VIDEO SAFELY
    =========================================================
    */

    function playVideo(video) {

        video.muted = true;


        const playPromise =
            video.play();


        if (
            playPromise !== undefined
        ) {

            playPromise.catch(() => {

                /*
                Browser autoplay protection.

                The video remains available as a
                background visual and will start once
                playback is permitted.
                */

            });

        }

    }


    /*
    =========================================================
    VISIBILITY HANDLING
    =========================================================
    */

    document.addEventListener(
        "visibilitychange",
        () => {

            const activeVideo =
                videos[currentIndex];


            if (
                document.hidden
            ) {

                videos.forEach(
                    video => video.pause()
                );

            } else {

                playVideo(activeVideo);

            }

        }
    );


    /*
    =========================================================
    REDUCED MOTION
    =========================================================
    */

    const reducedMotion =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );


    if (reducedMotion.matches) {

        videos.forEach(
            (video, index) => {

                if (index !== 0) {

                    video.style.display =
                        "none";

                }

            }
        );

    }

}