/*
rashomon
copyleft 2012
*/
var Rashomon = {
  manifestLoc: "manifest.json",
  manifest: {},
  videos: [],
  photos: [],
  loaded: 0,
  looping: false,
  startLoop: 0,
  endLoop: 0,
  delayFixed: 0,
  fulldur: 0,
  earliest: new Date(),
  timeline: "",
  videosToDisplay: "",
  colorList: ["#E88C03", "#CAEB47", "#1C9928", "#4789EB", "#60f"],
  validDate: function (item) {
    //makes sure date isn't from 1904 or 1946 (ENIAC) or sometime way before videos existed
    if (item.mcDate > 2000) {
      return item.mcDate;
    } else {
      return item.fmDate;
    }
  },
  loadFullscreen: function(id){
    console.log("FS for id " + id);
    var video = $("#video" + id);
    var ctime = Popcorn("#video" + id).currentTime();
    var sources = video.children();

    if (!sources) {
      alert("Something wrong with sources for this video");
    }
    
    Rashomon.timeline.pause();
    
    //$('body').css('overflow', "hidden");
    $('#fullscreen').fadeIn("slow");
    $("html, body").scrollTop(0);
    $("body").css("overflow", "hidden");
    var videotag = $("<video/>", { 'id': 'fsvid', "controls": true }).appendTo('#fsvidholder');
    Rashomon.videos[id].webm.appendTo(videotag);
    Rashomon.videos[id].mp4.appendTo(videotag);
    $("#fsvid").css("left",  $(window).width() / 2  -  $("#fsvid").width() / 2 );
    var fspop = Popcorn("#fsvid");
    fspop.on("loadedmetadata", function() {
      $("#fsvid").css("left",  $(window).width() / 2  -  $("#fsvid").width() / 2 );
      fspop.pause(ctime);
      $("#xbox").css({"top": 5, "left": $("#fsvid").offset().left + $("#fsvid").width() - 20});
    });
    fspop.on("canplay", function() {
      $("#fsvid").css("left",  $(window).width() / 2  -  $("#fsvid").width() / 2 );
      $("#fsvid").css("opacity", 1);
    });
  },
  offset2time: function(offset){
    var pct = offset / $('#maintimeline').width();
    var tldur = Rashomon.fulldur;
    return(tldur * pct);
  },
  getPct: function(offset){
    return( offset / $("#maintimeline").width() * 100 );
  },  
  //initiates loop, times determined by media or media fragment uri
  setupLoop: function(start, finish){
    var startPos = Rashomon.getOffset(start);
    var finishPos = Rashomon.getOffset(finish);
    var startPct = Rashomon.getPct(startPos);
    var finishPct = Rashomon.getPct(finishPos);
    Rashomon.looping = true;
    Rashomon.startLoop = start;
    Rashomon.endLoop = finish;
    Rashomon.timeline.cue(Rashomon.endLoop, function () {
      Rashomon.timeline.play(Rashomon.startLoop);
    });
    var tldur = Rashomon.fulldur;

    //add movers to timeline, set up slider
    var leftMover = $("<div/>", { "id": "leftMover", "class": "mover ui-slider-handle", "text": "\u25bc"}).appendTo("#maintimeline");
    var rightMover = $("<div/>", { "id": "rightMover", "class": "mover ui-slider-handle", "text": "\u25bc"}).appendTo("#maintimeline");
    $(".mover").css({ "background": "transparent", "border": "0", "margin-left": "-8px", "margin-top": "-12px", "color": "black", "cursor": "pointer"});
    $(".ui-slider-range").css({"position": "relative", "height": "100%", "border": "0", "border-radius": 0, "background": "url('images/reel.png') top left repeat-x"});
    $("#maintimeline").css({"border-radius": "0"});
    //make the loop selector
    $("#maintimeline").slider({
      range: true,
      min: 0,
      max: Rashomon.fulldur,
      values: [ start, finish ],
      change: function( event, ui ) {
        var value = ui.values;
        Rashomon.startLoop = ui.values[0];
        Rashomon.endLoop = ui.values[1];

        Rashomon.timeline.cue("loop", value[1], function(){
          console.log("reached end of loop");
            if (!Rashomon.timeline.media.paused){
              console.log("adjusting");
              Rashomon.timeline.currentTime(value[0]);
          }
        }); //end cue
        //move if currentTime is out of bounds
        console.log(value);
        if (Rashomon.timeline.currentTime() < value[0] || Rashomon.timeline.currentTime() > value[1]){
          Rashomon.timeline.currentTime(value[0]);
          if(Rashomon.timeline.media.paused){
            $(Rashomon.videos).each(function(){
              this.seekPaused();
            });
          } //end if 
        } //end if
      } //end slider
    }).css({ "border": "0", "border-bottom": "1px solid #666"});

    //handles the cues
    timepos = $("#timepos").position().left;
    //end setuploop
  },
  //formats exifTool's dates to something javascript Date object can use
  formatDate: function (exifDate) {
    if (!exifDate) {
      return false;
    }
    //input format looks like "YYYY:MM:DD HH:MM:SS:mm-05:00" (-05:00 is timezone)
    var date = exifDate.toString();
    var str = date.split(" "); //sep date from time
    var datesplit = str[0].split(":");
    var year = datesplit[0];
    var month = datesplit[1] - 1;
    var day = datesplit[2];
    var timesplit = str[1].split(":");
    var hour = timesplit[0];
    var minute = timesplit[1];
    var second = timesplit[2];
    if (timesplit[2].indexOf("-") !== -1) {
      //HUGE BUG this does not correct if you're in a time zone with a "+" of gmt. FIX LATER THANKS
      var zone = timesplit[2].split("-");
      second = zone[0];
      zone = zone[1].split(":");
      zone = zone[0];
      hour -= zone;
      hour = hour < 10 ? "0" + hour : hour;
    } //end if
    var d = new Date(year, month, day, hour, minute, second, 0);
    //console.log(d);
    //console.log("At the tone, the time will be: " + year + " " + month + " " + day + " " + hour + " " + minute + " " + second);
    return d;
  },
  //converts seconds to hh:mm:ss
  sec2hms: function (time) {
    var totalSec = parseInt(time, 10);
    var hours = parseInt(totalSec / 3600, 10) % 24;
    var minutes = parseInt(totalSec / 60, 10) % 60;
    var seconds = parseInt(totalSec % 60, 10);
    return (hours < 10 ? "0" + hours : hours) + ":" + (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds);
  },
  //deals with various duration metadata standards
  formatDuration: function (duration) {
    if (!duration) {
      return false;
    }
    var dur;
    //because having different cameras output duration in the same format would be crazy!
    if (duration.indexOf(":") !== -1) {
      //return Popcorn.util.toSeconds(duration)
      var split = duration.split(":");
      var hr = split[0];
      var min = split[1];
      var sec = +split[2];
      dur = (hr * 60 * 60) + (min * 60) + sec;
      return dur;
    } else if (duration.indexOf("s") !== -1) {
      var seconds = duration.split(".");
      dur = seconds[0];
      return dur;
    } else {
      console.log("Some weird duration, couldn't format");
    }
  },
  //coordinate conversion for GPS metadata
  convertCoord: function (coord) {
    var split = coord.split(" ");
    if (split[1] === "S" || split[1] === "W") {
      return split[0] * -1;
    } else {
      return split[0];
    }
  },
  isEven: function (someNumber) {
    return (someNumber % 2 === 0) ? "even" : "odd";
  },
  //sets up the timeline element and loads each video, determines timescope based on its contents
  setupTimeline: function (duration) {
    console.log("Setting up timeline.");
    Popcorn.player("baseplayer");
    this.timeline = Popcorn.baseplayer("#maintimeline");
    $("#eventTitle").text(Rashomon.eventName);
    Rashomon.timeline.cue("loop");
    //setup photos
    $(Rashomon.photos).each(function () {
      this.buildPhotoViewer();
    });
    //setup videos
    $(Rashomon.videos).each(function () {
      var id = this.id;
      var vid = this;
      //console.log("building video player " + this.id);
      this.buildVideoPlayer();
      //console.log("built");

      //lower volume
      this.pp.volume(0.33);
      //once metadata has loaded, read video timing/size metadata and add video to timeline
      this.pp.on('loadeddata', function () {
        console.log("Can play " + id);
        Rashomon.loaded++;
        var of = vid.offset;
        var duration = vid.pp.duration();
        $(this).attr('data-duration', vid.pp.duration());
        var height = +vid.pp.media.videoHeight;
        var width = +vid.pp.media.videoWidth;
        //console.log(pid + ": " + height + " x " + width);
        if (height > width) {
          $("#video" + id).addClass("vert");
        } else {
          $("#video" + id).addClass("hor");
        }
        var offtime = parseInt(Popcorn.util.toSeconds(duration) + of, 10);
        Rashomon.timeline.rashomonVideo({"vid": vid, "timeline": Rashomon.timeline, "start": of, "end": offtime});
        $("#timepos").on("mousedown", function(){
          if (!Rashomon.timeline.media.paused){
                Rashomon.resume = true;
              }
          Rashomon.timeline.pause();

        });
        //All videos have loaded, finish setting up.
        if (Rashomon.loaded === Rashomon.videos.length) {
          console.log("Finished setting up");
          $("#timeDisplay").fadeIn();
          $("#timeDisplay").css({ "margin-left": "-" + $("#timeDisplay").width() / 2 + "px"});
          var newheight = $("#maintimeline").offset().top + $("#maintimeline").height() - $("#vidlines").offset().top;
          //set up time position draggable events
          $("#timepos").draggable({
            "containment": "parent",
            "axis": "x",
            "start": function(event,ui){
              if (!Rashomon.timeline.media.paused){
                Rashomon.resume = true;
              }
              Rashomon.timeline.pause();

            },
            "drag": function(event,ui){
              console.log(ui.position.left);
              $("#timeDisplay").css({left: ui.position.left });
              var pct = ui.position.left / $('#maintimeline').width();
              $("#timeDisplay").text(Rashomon.sec2hms(Rashomon.fulldur * pct));

            },
            "stop": function(event,ui){

              var pct = $("#timepos").position().left / $('#maintimeline').width();
              var tldur = Rashomon.fulldur;
              Rashomon.timeline.currentTime(tldur * pct);
              if(Rashomon.resume){
                Rashomon.timeline.play();
                Rashomon.resume = false;
              } else {
                $(Rashomon.videos).each(function(){
                  this.seekPaused();
                });
              }

            }
          });
          //not fond of this, but it seems to keep playhead from locking.  using better event than metadataloaded could help?
          setTimeout(function () {
          $("#timepos").css({"height": newheight, "cursor": "pointer"});
          $("#timepos").show();
          $(".vidnum").addClass("vidactive");
          var url = $.url();
          //detects for Media Fragment uri (?t=15,5 returns a 5 second loop starting at 15 seconds)
          if (url.attr("fragment")){
            var frag = url.attr("fragment");
            var fragtemp = frag.split("=");
            fragtemp = fragtemp[1].split(",");
            var loopStart = parseInt(fragtemp[0], 10);
            var loopEnd = parseInt(loopStart + parseInt(fragtemp[1], 10), 10);
            Rashomon.setupLoop(loopStart, loopEnd);
          } else {
            Rashomon.setupLoop(0, Rashomon.fulldur - 5);
          }
            Rashomon.timeline.play(Rashomon.startLoop);
          }, 2500);
        }
      }); //end bind
    }); //end each
    
    this.timeline.currentTime(0);  //Start at beginning of timeline, 
    this.fulldur = duration; // end of final video

    //When timeline plays... 
    this.timeline.on("play", function () {
      //make sure it is within the loop selection
      if (Rashomon.timeline.currentTime() < Rashomon.startLoop || Rashomon.timeline.currentTime() > Rashomon.endLoop){
        Rashomon.timeline.currentTime(Rashomon.startLoop);
      }
      //toggle buttons
      $("#play").hide();
      $("#stop").show();
      //each video checks to see if it should play
      $(Rashomon.videos).each(function () {
        var offset = this.offset;
        var duration = this.pp.duration();
        if (Rashomon.timeline.currentTime() > offset && Rashomon.timeline.currentTime() < offset + duration && !$("#vcontain" + this.id).is(":hidden")) {
          this.pp.play();
        }
      }); // end videos each
    }); //end play

    //when timeline pauses...
    this.timeline.on("pause", function () {
      //toggle buttons
      $("#play").show();
      $("#stop").hide();
      //pause all videos (no need to check if already paused)
      $(Rashomon.videos).each(function () {
        this.pp.pause(Rashomon.timeline.currentTime() - this.offset);
      });
    }); //end pause

    
    this.timeline.cue(Rashomon.fulldur - 0.01, function () {
      Rashomon.timeline.pause();
      console.log("pausing");
    }); //end cue
    //play button behavior
    $("#play").click(function () {
      //console.log(Rashomon.timeline.currentTime() + "of " + Rashomon.fulldur);
      if (Rashomon.timeline.currentTime() < Rashomon.fulldur) {
        Rashomon.timeline.play();
      }
    });
    //pause media when stop button is pressed
    $("#stop").click(function () {
      Rashomon.timeline.pause();
    });
    $("#forward").click(function() {
      //reduced so it doesn't trigger the loop rewind
      Rashomon.timeline.pause(Rashomon.endLoop - 0.5);
    });
    $("#rewind").click(function() {
      Rashomon.timeline.currentTime(Rashomon.startLoop);
    });

    //adjust playhead when main timeline moves
    Rashomon.timeline.on("timeupdate", function () {
      if (this.currentTime() > Rashomon.fulldur - 0.5) {
        this.pause(Rashomon.fulldur - 0.5);
      }
      //if you glitch and pass the loop endtime,
      
      var pct = this.currentTime() / Rashomon.fulldur * 100; // for when we switch to % for window size adjustments
      $("#timeloc, #timeDisplay").text(Rashomon.sec2hms(this.currentTime()));
      $("#timepos, #timeDisplay").css('left', pct + "%");
    });
    //on navtl click, adjust video positions appropriately, obeying play conditions and such
  },
  getOffset: function (time) {
    return $("#maintimeline").width() * time / Popcorn.util.toSeconds(this.fulldur);
  },
  // reads videos from rashomonManifest object, which is created by another hunk of js linked in the html
  setupVideos: function () {
    console.log("Setting up videos");
    var l = Rashomon.filenames.length;
    $.each(Rashomon.filenames, function (index) {
      var item = {};
      item.filename = '' + this;
      $.getJSON(Rashomon.dataPath + this + ".json", function (itemdata) {
        item.origDate = Rashomon.formatDate(itemdata[0].DateTimeOriginal);
        item.tcDate = Rashomon.formatDate(itemdata[0].TrackCreateDate);
        item.tmDate = Rashomon.formatDate(itemdata[0].TrackModifyDate);
        item.fmDate = Rashomon.formatDate(itemdata[0].FileModifyDate);
        item.mcDate = Rashomon.formatDate(itemdata[0].MediaCreateDate);
        item.mDate = Rashomon.formatDate(itemdata[0].MediaModifyDate);
        item.duration = Rashomon.formatDuration(itemdata[0].Duration);
        //get other tags like geo coords here
        item.vDate = Rashomon.validDate(item);
        if (item.vDate.getTime() < Rashomon.earliest.getTime()) {
          Rashomon.earliest = item.vDate;
          //console.log("Earliest now " + Rashomon.earliest);
        }
        if (item.duration) {
          Rashomon.videos.push(new video({
            "offset": item.vDate.getTime() / 1000,
            "duration": +item.duration,
            "id": index,
            "file": item.filename,
            "meta": itemdata[0]
          }));
        } else {
          var aphoto = Rashomon.photos.push(new photo({
            "offset": item.vDate.getTime() / 1000,
            "id": index,
            "file": item.filename,
            "meta": itemdata[0]
          }));
        }
        l--;
        if (Rashomon.videos.length + Rashomon.photos.length === Rashomon.filenames.length) {
          //console.log("Finished last file");
          $.each(Rashomon.videos, function () {
            var id = this.id;
            this.offset -= Rashomon.earliest.getTime() / 1000 - 1;
            $('#video' + id).attr('data-offset', this.offset);
            if (this.duration + this.offset > Rashomon.fulldur) {
              Rashomon.fulldur = this.duration + this.offset + 15;
            }
          });
          $.each(Rashomon.photos, function () {
            this.offset -= Rashomon.earliest.getTime() / 1000 - 1;
            //console.log(this.offset + "is the new offset");
            if (this.offset > Rashomon.fulldur) {
              Rashomon.fulldur = this.duration + this.offset + 15;
            }
          });
          Rashomon.setupTimeline(Rashomon.fulldur);
          $.each(Rashomon.videos, function () {
            this.displayVideo();
          }); //end each
        } // end if
      }); //end getJSON (per item)
    }); //end each
  }
};
var photo = function (options) {
  this.offset = options.offset;
  this.name = options.file;
  this.file = options.file;
  this.id = options.id;
  this.color = Rashomon.colorList[this.id];
  this.meta = options.meta;
  var photo = this;

  this.showPhoto = function () {
      $("#pContainer" + this.id).show("fast", "linear");
    };
  this.hidePhoto = function () {
    if ($("#pContainer" + this.id).is(":visible")) {
      $("#pContainer" + this.id).hide("fast", "linear");
    }
  };
  this.showMeta = function () {
    $("#meta").css("right", "0");
    //console.log(this.meta);
    $("#metadata ul").remove();
    var list = $("<ul/>");
    $("<li/>", {
      text: "Filename : " + this.file
    }).appendTo(list);
    $("<li/>", {
      text: "Start time: " + this.meta.MediaCreateDate
    }).appendTo(list);
    $("<li/>", {
      text: "Offset: " + this.offset + "s"
    }).appendTo(list);
    
    $("<li/>", {
      text: "..."
    }).appendTo(list);
    list.appendTo("#metadata");
  };
  this.buildPhotoViewer = function () {

    var pContainer = $("<div/>", {
      id: "pContainer" + this.id,
      'class': 'container'
    }).css("border-color", Rashomon.colorList[this.id]);
    var tools = $("<div/>", {
      'class': 'tools'
    });
    var image = $("<img/>", {
      id: "photo" + this.id,
      "class": 'rashomon',
      "data-offset": this.offset,
      "data-id": this.id,
      "src": Rashomon.mpath + this.file + "_320.jpg"
    });

    pContainer.appendTo("#videos");
    image.appendTo(pContainer);
    tools.html("<em>" + (this.id + 1) + "</em> <div class='tbuttons'><img src='images/full-screen-icon.png' class='fsbutton' id='fs" + this.id + "'").appendTo(pContainer);
    // <img src='images/info.png' class='showmeta' id='meta" + this.id + "'>")
    //make display function for timeline thing
    //call popcorn plugin

    $("#meta" + this.id).click(function () {
        photo.showMeta();
        return false;
    });

    Rashomon.timeline.rphoto({ "id": this.id, "start": this.offset, "end": this.offset + 5 });
    $("<img/>", {
      id: "pthumb" + this.id,
      "class": 'photothumb',
      "data-id": this.id,
      "src": Rashomon.mpath + this.file + "_320.jpg"
    }).css({ "left": (Rashomon.getOffset(this.offset) / $("#maintimeline").width() * 100 + "%")}).appendTo("#maintimeline");
    
  }; // end viewer
}; // end photo
var video = function (options) {
  this.offset = parseInt(options.offset, 10);
  this.duration = parseInt(options.duration, 10);
  this.name = options.file;
  this.file = options.file;
  this.id = options.id;
  this.color = Rashomon.colorList[this.id];
  this.meta = options.meta;
  this.buildVideoPlayer = function () {
    var container = $("<div/>", {
      id: "vcontain" + this.id,
      'class': 'container'
    }).css("border-color", Rashomon.colorList[this.id]);
    var tools = $("<div/>", {
      'class': 'tools'
    });
    var vid = $("<video/>", {
      id: "video" + this.id,
      "class": 'rashomon',
      "data-offset": this.offset,
      "data-id": this.id
    });
    this.webm = $("<source/>", {
      src: Rashomon.mpath + this.file + ".webm",
      type: 'video/webm'
    });
    this.mp4 = $("<source/>", {
      src: Rashomon.mpath + this.file + ".mp4",
      type: 'video/mp4'
    });
    this.mp4.appendTo(vid);
    this.webm.appendTo(vid);
    container.appendTo($("#videos"));
    vid.appendTo(container);
    //this one has meta button
    //tools.html("<em>" + (this.id + 1) + "</em> <div class='tbuttons'><img src='images/full-screen-icon.png' + class='fsbutton' id='fs" + this.id + "'/> <img src='images/info.png' class='showmeta' id='meta" + this.id + "'>").appendTo(container);
    //this one doesn't
    tools.html("<em>" + (this.id + 1) + "</em> <div class='tbuttons'><img src='images/full-screen-icon.png' + class='fsbutton' id='fs" + this.id + "'/>").appendTo(container);

    $("<div/>", {
      "id": "vidDelay" + this.id,
      "class": "vidDelay"
    }).appendTo(tools);
    this.pp = Popcorn("#video" + this.id);
  };
  //in cases where you seek when main timeline is paused, popcorn does not run 'start' event if seeking from within another in-band event
  this.seekPaused = function() {
    this.pp.currentTime(Rashomon.timeline.currentTime() - this.offset);
  };

  this.showVid = function () {
    $("#vcontain" + this.id).show("fast", "linear");
    
  };
  this.hideVid = function () {
    this.pp.pause();
    if ($("#vcontain" + this.id).is(":visible")) {
      $("#vcontain" + this.id).hide("fast", "linear");

    }
  };
  this.showMeta = function () {
    $("#meta").css("right", "0");
    //console.log(this.meta);
    $("#metadata ul").remove();
    var list = $("<ul/>");
    $("<li/>", {
      text: "Filename : " + this.file
    }).appendTo(list);
    $("<li/>", {
      text: "Start time: " + this.meta.MediaCreateDate
    }).appendTo(list);
    $("<li/>", {
      text: "Offset: " + this.offset + "s"
    }).appendTo(list);
    $("<li/>", {
      text: "Duration: " + this.meta.Duration
    }).appendTo(list);
    $("<li/>", {
      text: "..."
    }).appendTo(list);
    list.appendTo("#metadata");
  };
  this.drawVidtimes = function () {
    var newwidth = Rashomon.getOffset(this.duration) / $("#maintimeline").width() * 100 + "%";
    $("#vidtime" + this.id).css({
      "width": newwidth,
      "left": ( Rashomon.getOffset(this.offset) / $("#maintimeline").width() * 100 + "%")
    });
  };
  this.toggleStatus = function () {

    if ($("#vid" + this.id).hasClass("vidactive")){
      //shut it down!
      this.pp.pause();

      $("#vid" + this.id).removeClass("vidactive");
      $("#vid" + this.id).addClass("vidinactive");
      $("#vcontain" + this.id).hide("fast", "linear");
      $("#vidtime" + this.id).css("opacity", "0.25");
    } else {
      //turn it on!
      $("#vid" + this.id).addClass("vidactive");
      $("#vid" + this.id).removeClass("vidinactive");
      $("#vidtime" + this.id).css("opacity", "1");

      console.log("on " + this.id);
      console.log(Rashomon.timeline.currentTime() + " between points " + this.offset + " " + (this.offset + this.duration) + "?");
      if ( Rashomon.timeline.currentTime() > this.offset && Rashomon.timeline.currentTime() < (this.offset + this.duration)){
        console.log("truth");
        $("#vcontain" + this.id).show("fast", "linear");
        if (Rashomon.timeline.media.paused === false){
         this.pp.play();    
        }
      }
    }

  };
  this.displayVideo = function () {
    var vid = this;
    var id = this.id;
    var duration = this.duration;
    var meta = this.meta;
    var offset = this.offset;
    var position = Rashomon.getOffset(offset);
    //console.log("Offset" + this.offset + "data " + $("#video" + id).attr("data-offset"));
    //console.log(offset);
    //todo duration->space, match meta to real meta
    var leftpos = position;
    var vidline = $("<div/>", {
      "class": "vidline " + Rashomon.isEven(id),
      "id": "vidline" + id
    });
    var vidnum = $("<div/>", {
      "class": "vidnum",
      "id": "vid" + id,
      "text": +id + 1,
      title: "Click to toggle video"
    }).appendTo(vidline);
    /* removing meta from next to number
    var vidmeta = $("<div/>", {
      "class": "vidmeta"
    }).appendTo(vidline);
    $("<p/>", {
      text: meta
    }).appendTo(vidmeta);
    $("<p/>", {
      text: "start: " + Rashomon.sec2hms(offset)
    }).appendTo(vidmeta);
    $("<p/>", {
      text: "duration: " + Rashomon.sec2hms(duration)
    }).appendTo(vidmeta);
    */
    var vidtl = $("<div/>", {
      "class": "vidtl",
      "id": "tl" + id,
      "data-id": id
    }).appendTo(vidline);
    var vidtime = $("<div/>", {
      "class": "vidtime",
      "id": "vidtime" + id,
      "data-id": id,
      "title": this.file
    }).css({
      "left": leftpos / $("#maintimeline").width() * 100 + "%",
      "width": "1px",
      "background": Rashomon.colorList[id]
    }).appendTo(vidtl);
    //console.log("Offset for duration " + duration + " is " + Rashomon.getOffset(duration));
    vidline.appendTo("#vidlines");
    $('.vidline').tsort({
      attr: 'id'
    });
    this.drawVidtimes();
    /*  block to show relative time, calculation is wrong to show time
      $('.vidtl').mousemove(function(e){
          var mouseleft = e.pageX - $('#maintimeline').offset().left;
          var pct = mouseleft / $('#maintimeline').width();
          var tldur = Rashomon.fulldur);
          $('#mouseloc').html(Rashomon.sec2hms(tldur * pct));
      });
      */
    /* experimental seeking optimization code
    $("#video" + id).on("seeking", function () {
      if (!Rashomon.timeline.media.paused && Popcorn("#video" + id).media.paused) {
        Rashomon.timeline.resume = true;
        Rashomon.timeline.pause();
      }
    });
    $("#video" + id).on("seeked", function () {
      if (Rashomon.timeline.resume) {
        Rashomon.timeline.play();
        Rashomon.timeline.resume = false;
      }
    });
    */
    /* muting/unmuting
    $("#video" + id).mouseover(function () {
      Popcorn("#video" + id).unmute();
    });
    $("#video" + id).mouseleave(function () {
      Popcorn("#video" + id).mute();
    });
    */
    //trigger fullscreen
    $("#fs" + id).click(function () {
      Rashomon.loadFullscreen(id);
      return false;
    });
    //toggle metadata
    $("#meta" + id).click(function () {
      vid.showMeta();
      return false;
    });
    //on timeline click, seek.
    $("#tl" + id).click(function (e) {
      var clickleft = e.pageX - $('#maintimeline').offset().left;
      var pct = clickleft / $('#maintimeline').width();
      var tldur = Popcorn.util.toSeconds(Rashomon.fulldur);
      Rashomon.timeline.currentTime(tldur * pct);
      if (Rashomon.timeline.media.paused) {
        $(Rashomon.videos).each(function(){
          this.seekPaused();
        });
      }
    }); //end nav click
    $("#vid" + id).click(function () {
      vid.toggleStatus();


    }); // end vidnum click

    this.pp.on('timeupdate', function () {
      var delay = (Rashomon.timeline.currentTime() - (vid.offset + this.currentTime())).toFixed(2) * 1000;
      if (!Rashomon.timeline.media.paused && Math.abs(delay) > 1250) {
        this.currentTime(Rashomon.timeline.currentTime() - vid.offset);
        Rashomon.delayFixed++;
      }
      //var syncmsg = "<p>" + id + " " + vid.file + "</p>" + "<p>CurrentTime: " + Rashomon.timeline.currentTime().toFixed(2) + "</p>" + "<p>Video Location: " + (vid.offset + this.currentTime()).toFixed(2) + "</p>" + "<p>Offset: " + vid.offset + "</p>" + "<p>Video Drift: " + delay + "ms</p>";
      //syncmsg = "<p>Video Drift: " + delay + "ms</p>";
      //$("#vidDelay" + id).html(syncmsg);
    }); //end on
  };
  return this.id;
}; // end video




$(document).ready(function () {
  //loads filenames from manifest.json in local folder
  $.getJSON(Rashomon.manifestLoc, function (data) {
    Rashomon.manifest = data;
    Rashomon.mpath = Rashomon.manifest.mediaPath;
    Rashomon.dataPath = Rashomon.manifest.dataPath;
    Rashomon.eventName = Rashomon.manifest.event;
    Rashomon.filenames = Rashomon.manifest.files;

    Rashomon.setupVideos(); // could point to one from a different event or something  
  });
  $("#metaX").click(function () {
    $("#meta").css("right", "-210px");
  
    //When the message box is closed, fade out
    $("#xbox").click(function(){
      $("#fsvid").remove();
      $("#fullscreen").fadeOut();
      $("body").css("overflow", "visible");
      return false;
    });

  });
}); //end docReady
//last freehanging event because it needs a rewrite
function displayEvent(id, title, color, time) {
  //todo need to figure out how to distribute colors, convert time to space
  $("<div/>", {
    "class": 'event',
    "id": "event_" + id,
    "title": title
  }).css({
    'left': time / $("#maintimeline").width() * 100 + "%",
    'background': color
  }).appendTo("#maintimeline");
}
