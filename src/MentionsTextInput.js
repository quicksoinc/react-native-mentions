import React, { Component } from 'react';
import {
  Text,
  View,
  Animated,
  TextInput,
  SectionList,
  ViewPropTypes,
} from 'react-native';
import PropTypes from 'prop-types';

const SUGGESTION_MATCH_LENGTH = 3;

const getLength = (data) => {
  let length = 0;
  data.forEach(element => {
    length += element.data.length
  });
  return length;
}

export default class MentionsTextInput extends Component {
  constructor() {
    super();
    this.state = {
      textInputHeight: "",
      isTrackingStarted: false,
      suggestionRowHeight: new Animated.Value(0),

    }
    this.isTrackingStarted = false;
    this.previousChar = " ";
  }

  componentWillMount() {
    this.setState({
      textInputHeight: this.props.textInputMinHeight
    })
  }

  componentWillReceiveProps(nextProps) {
    if (!nextProps.value) {
      this.resetTextbox();
    } else if (this.isTrackingStarted && !nextProps.horizontal && getLength(nextProps.suggestionsData) !== 0) {
      const numOfRows = nextProps.MaxVisibleRowCount >= getLength(nextProps.suggestionsData) ? getLength(nextProps.suggestionsData) : nextProps.MaxVisibleRowCount;
      const height = numOfRows * nextProps.suggestionRowHeight;
      this.openSuggestionsPanel(height);
    }
  }

  startTracking() {
    this.isTrackingStarted = true;
    this.openSuggestionsPanel();
    this.setState({
      isTrackingStarted: true
    })
  }

  stopTracking() {
    this.isTrackingStarted = false;
    this.closeSuggestionsPanel();
    this.setState({
      isTrackingStarted: false
    })
  }

  openSuggestionsPanel(height) {
    Animated.timing(this.state.suggestionRowHeight, {
      toValue: height ? height : this.props.suggestionRowHeight,
      duration: 100,
    }).start();
  }

  closeSuggestionsPanel() {
    Animated.timing(this.state.suggestionRowHeight, {
      toValue: 0,
      duration: 100,
    }).start();
  }

  updateSuggestions(lastKeyword) {
    this.props.triggerCallback(lastKeyword);
  }

  getBoundary(matcher) {
    const matcherBoundary =
      matcher.length && matcher.startsWith(this.props.trigger) == 1 ? "B" : "b";
    const boundary =
      this.props.triggerLocation === "new-word-only" ? matcherBoundary : "";
    return boundary;
  }

  identifyKeyword(val, matcher) {
    if (this.isTrackingStarted) {
      const boundary = this.getBoundary(matcher);
      const escapedTrigger = matcher.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const pattern = new RegExp(
        `\\${boundary}${escapedTrigger}[a-z0-9_-]+|\\${boundary}${escapedTrigger}`,
        `gi`,
      );

      const keywordArray = val.match(pattern);
      if (keywordArray && !!keywordArray.length) {
        const lastKeyword = keywordArray[keywordArray.length - 1];
        this.updateSuggestions(lastKeyword);
      }
    }
  }

  isSuggestionMatch(lastNChar) {
    // TODO szaboat
    const lastNMatches = this.props.suggestionsData[0].data.some((suggestion) => {
      const name = suggestion.name.toLowerCase();
      const lastNLowCase = lastNChar.trim().toLowerCase();
      if (
        lastNLowCase.length == SUGGESTION_MATCH_LENGTH &&
        name.indexOf(lastNLowCase) != -1
      ) {
        return true;
      }
    });

    return lastNMatches;
  }

  onChange(e) {
    const val = e.nativeEvent.text;
    this.props.onChangeText(val); // pass changed text back
    const lastChar = val.substr(val.length - 1);
    const lastNChar = val.substr(val.length - SUGGESTION_MATCH_LENGTH);
    const triggerMatch = lastChar === this.props.trigger;
    const suggestionMatch = this.isSuggestionMatch(lastNChar);
    
    if (triggerMatch || suggestionMatch) {
      this.startTracking();
    } else if (
      (lastChar === " " && this.state.isTrackingStarted) ||
      val === ""
    ) {
      this.stopTracking();
    }
    this.previousChar = lastChar;

    let matcher = this.props.trigger;

    if (suggestionMatch) {
      const words = val.split(" ");
      matcher = words[words.length - 1];
    }

    this.identifyKeyword(val, matcher);
  }

  resetTextbox() {
    this.previousChar = " ";
    this.stopTracking();
    this.setState({ textInputHeight: this.props.textInputMinHeight });
  }

  render() {
    return (
      <View>
        <Animated.View style={[{ ...this.props.suggestionsPanelStyle }, { height: this.state.suggestionRowHeight }]}>
          <SectionList
            keyboardShouldPersistTaps={"always"}
            horizontal={this.props.horizontal}
            ListEmptyComponent={this.props.loadingComponent}
            enableEmptySections={true}
            sections={this.props.suggestionsData}
            keyExtractor={this.props.keyExtractor}
            renderItem={(rowData) => { return this.props.renderSuggestionsRow(rowData, this.stopTracking.bind(this)) }}
            renderSectionHeader={({ section: { title } }) => (
              <Text style={this.props.sectionHeaderStyle}>{title}</Text>
            )}
            stickySectionHeadersEnabled={false}
          />
        </Animated.View>
        <TextInput
          {...this.props}
          onContentSizeChange={(event) => {
            this.setState({
              textInputHeight: this.props.textInputMinHeight >= event.nativeEvent.contentSize.height ? this.props.textInputMinHeight : event.nativeEvent.contentSize.height + 10,
            });
          }}
          ref={(component) => (this._textInput = component)}
          onChange={this.onChange.bind(this)}
          multiline={true}
          value={this.props.value}
          style={[{ ...this.props.textInputStyle }, { height: Math.min(this.props.textInputMaxHeight, this.state.textInputHeight) }]}
          placeholder={this.props.placeholder ? this.props.placeholder : 'Write a comment...'}
        />
      </View>
    )
  }
}

MentionsTextInput.propTypes = {
  textInputStyle: TextInput.propTypes.style,
  suggestionsPanelStyle: ViewPropTypes.style,
  loadingComponent: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.element,
  ]),
  textInputMinHeight: PropTypes.number,
  textInputMaxHeight: PropTypes.number,
  trigger: PropTypes.string.isRequired,
  triggerLocation: PropTypes.oneOf(['new-word-only', 'anywhere']).isRequired,
  value: PropTypes.string.isRequired,
  onChangeText: PropTypes.func.isRequired,
  triggerCallback: PropTypes.func.isRequired,
  renderSuggestionsRow: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.element,
  ]).isRequired,
  suggestionsData: PropTypes.array.isRequired,
  keyExtractor: PropTypes.func.isRequired,
  horizontal: PropTypes.bool,
  suggestionRowHeight: PropTypes.number.isRequired,
  MaxVisibleRowCount: function(props, propName, componentName) {
    if(!props.horizontal && !props.MaxVisibleRowCount) {
      return new Error(
        `Prop 'MaxVisibleRowCount' is required if horizontal is set to false.`
      );
    }
  },
  sectionHeaderStyle: Text.propTypes.style
};

MentionsTextInput.defaultProps = {
  textInputStyle: { borderColor: '#ebebeb', borderWidth: 1, fontSize: 15 },
  suggestionsPanelStyle: { backgroundColor: 'rgba(100,100,100,0.1)' },
  loadingComponent: () => <Text>Loading...</Text>,
  textInputMinHeight: 30,
  textInputMaxHeight: 80,
  horizontal: true,
  sectionHeaderStyle: {
    fontSize: 12,
    textTransform: "uppercase",
    backgroundColor: "#E6E9EB",
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 4,
  }
}
