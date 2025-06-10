import RecordRTC from "recordrtc";

function init(Survey) {
  const iconId = "icon-microphone";
  const componentName = "microphone";
  Survey.SvgRegistry && Survey.SvgRegistry.registerIconFromSvg(iconId, require('svg-inline-loader?classPrefix!./images/microphone.svg'), "");
  var widget = {
    name: componentName,
    title: "Microphone",
    iconName: iconId,
    widgetIsLoaded: function() {
      return typeof RecordRTC != "undefined";
    },
    isFit: function(question) {
      return question.getType() === componentName;
    },
    htmlTemplate: `
      <div>
        <button
          type="button"
          title="Record"
          style="
            padding: 0.8rem 1rem;
            background: #19b394;
            color: white;
            border: none;
            border-radius: 0.25rem;
          "
        >
          <i class="fa fa-microphone" aria-hidden="true"></i>
        </button>

        <button
          type="button"
          title="Save"
          style="
            padding: 0.8rem 1rem;
            background: #e60a3e;
            color: white;
            border: none;
            border-radius: 0.25rem;
          "
        >
          <i class="fa fa-cloud" aria-hidden="true"></i>
        </button>

        <audio
          controls
          style="
            vertical-align: top;
            margin-left: 10px;
            height: 35px;
            width: 70%;
          "
        ></audio>
      </div>
    `,

    activatedByChanged: function(activatedBy) {
      Survey.Serializer.addClass(componentName, [], null, "empty");
      let registerQuestion = Survey.ElementFactory.Instance.registerCustomQuestion;
      if(!!registerQuestion) registerQuestion(componentName);
    },
    afterRender: function(question, el) {
      var rootWidget = this;
      var buttonStartEl = el.getElementsByTagName("button")[0];
      var buttonStopEl = el.getElementsByTagName("button")[1];
      var audioEl = el.getElementsByTagName("audio")[0];
      var log = function(msg) {
        //console.log(msg);
      };
  
      //////////  RecordRTC logic

      var successCallback = function(stream) {
        var options = {
          type: "audio",
          mimeType: "audio/webm",
          audioBitsPerSecond: 44100,
          sampleRate: 44100,
          bufferSize: 16384,
          numberOfAudioChannels: 1
        };
        log("successCallback");
        question.survey.mystream = stream;
        question.survey.recordRTC = RecordRTC(
          question.survey.mystream,
          options
        );
        if (typeof question.survey.recordRTC != "undefined") {
          log("startRecording");
          question.recordingStartedAt = new Date();
          question.survey.recordRTC.startRecording();
        }
      };

      var errorCallback = function() {
        alert("No microphone");
        question.survey.recordRTC = undefined;
        question.survey.mystream = undefined;
      };

      var processAudio = function(audioVideoWebMURL) {
        log("processAudio");
        var recordedBlob = question.survey.recordRTC.getBlob();

        var fileReader = new FileReader();
        fileReader.onload = function(event) {
          var dataUri = event.target.result;
          log("dataUri: " + dataUri);
          question.value = dataUri;
          audioEl.src = dataUri;

          log("cleaning");
          question.survey.recordRTC = undefined;
          question.survey.mystream = undefined;
        };
        fileReader.readAsDataURL(recordedBlob);
      };

      var startRecording = function() {
        question.recordingStartedAt = undefined;
        question.recordingEndedAt = undefined;
        question.recordingDuration = undefined;
        // erase previous data
        question.value = undefined;

        // if recorder open on another question	- try to stop recording
        if (typeof question.survey.recordRTC != "undefined") {
          question.survey.recordRTC.stopRecording(doNothingHandler);
          if (typeof question.survey.mystream != "undefined") {
            question.survey.mystream.getAudioTracks().forEach(function(track) {
              track.stop();
            });
          }
        }

        var mediaConstraints = {
          video: false,
          audio: true
        };

        navigator.mediaDevices
          .getUserMedia(mediaConstraints)
          .then(successCallback.bind(this), errorCallback.bind(this));
      };

      var stopRecording = function() {
        log("stopRecording");
        var eD = new Date();
        question.recordingEndedAt = eD;
        question.recordingDuration = eD - question.recordingStartedAt;
        if (typeof question.survey.recordRTC != "undefined") {
          question.survey.recordRTC.stopRecording(processAudio.bind(this));
          if (typeof question.survey.mystream != "undefined") {
            question.survey.mystream.getAudioTracks().forEach(function(track) {
              track.stop();
            });
          }
        }
      };

      //////////////  end RTC logic //////////////////

      if (!question.isReadOnly) {
        buttonStartEl.onclick = startRecording;
      } else {
        buttonStartEl.parentNode.removeChild(buttonStartEl);
      }

      if (!question.isReadOnly) {
        buttonStopEl.onclick = stopRecording;
      } else {
        buttonStopEl.parentNode.removeChild(buttonStopEl);
      }

      audioEl.src = question.value;

      var updateValueHandler = function() {};

      var doNothingHandler = function() {};

      question.valueChangedCallback = updateValueHandler;
      updateValueHandler();
    },
    willUnmount: function(question, el) {
      if (typeof question.survey.recordRTC != "undefined") {
        question.survey.recordRTC.stopRecording(doNothingHandler);
        if (typeof question.survey.mystream != "undefined") {
          question.survey.mystream.getAudioTracks().forEach(function(track) {
            track.stop();
          });
        }
        question.value = undefined;
        question.survey.recordRTC = undefined;
        question.survey.mystream = undefined;
      }
    }
  };

  Survey.CustomWidgetCollection.Instance.addCustomWidget(widget, "customtype");
}

if (typeof Survey !== "undefined") {
  init(Survey);
}

export default init;
