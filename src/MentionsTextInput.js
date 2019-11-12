import React, { Component } from 'react';
import {
  Text,
  View,
  Animated,
  TextInput,
  SectionList,
  StyleSheet,
  ViewPropTypes,
} from 'react-native';
import PropTypes from 'prop-types';

const SUGGESTION_MATCH_LENGTH = 3;

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 12,
    textTransform: "uppercase",
    backgroundColor: "#E6E9EB",
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 4,
  },
});

export default class MentionsTextInput extends Component {
  constructor() {
    super();
    this.state = {
      textInputHeight: "",
      isTrackingStarted: false,
      suggestionRowHeight: new Animated.Value(0),
      sections: [],
    };
    this.isTrackingStarted = false;
    this.previousChar = " ";

    this.renderItem = (rowData) => {
      return this.props.renderSuggestionsRow(
        rowData,
        this.stopTracking.bind(this),
      );
    };

    this.renderSectionHeader = ({ section: { title } }) => {
      return <Text style={styles.sectionHeader}>{title}</Text>;
    };
  }

  componentWillMount() {
    this.setState({
      textInputHeight: this.props.textInputMinHeight
    })
  }

  componentWillReceiveProps(nextProps) {
    // This is emulating `useEffect(fn, [suggestionsData])`]
    if (nextProps.suggestionsData !== this.props.suggestionsData) {
      this.setState({
        sections: this.props.sectionsMapper(nextProps.suggestionsData),
      });
    }

    if (!nextProps.value) {
      this.resetTextbox();
    } else if (this.isTrackingStarted && !nextProps.horizontal && nextProps.suggestionsData.length !== 0) {
      const numOfRows = nextProps.MaxVisibleRowCount >= nextProps.suggestionsData.length ? nextProps.suggestionsData.length : nextProps.MaxVisibleRowCount;
      const height = numOfRows * nextProps.suggestionRowHeight;
      // TODO szaboat: calculate
      const sectionsHeight = 40;
      this.openSuggestionsPanel(height + sectionsHeight);
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

  isSuggestionMatch(lastWord) {
    if (lastWord.length >= SUGGESTION_MATCH_LENGTH) {
      return this.props.isSuggestionMatch(lastWord);
    } else {
      return false;
    }
  }

  onChange(e) {
    const val = e.nativeEvent.text;
    this.props.onChangeText(val); // pass changed text back
    const lastChar = val.substr(val.length - 1);
    const words = val.split(" ");
    const lastWord = words[words.length - 1];
    const triggerMatch = lastChar === this.props.trigger;
    const suggestionMatch = this.isSuggestionMatch(lastWord);

    if (triggerMatch) {
      this.updateSuggestions(this.props.trigger);
      this.startTracking();
    } else if (suggestionMatch) {
      this.updateSuggestions(lastWord);
      this.startTracking();
    } else if (
      (lastChar === " " && this.state.isTrackingStarted) ||
      val === ""
    ) {
      this.stopTracking();
    }
    this.previousChar = lastChar;
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
            windowSize={10}
            removeClippedSubviews={true}
            horizontal={this.props.horizontal}
            ListEmptyComponent={this.props.loadingComponent}
            enableEmptySections={true}
            sections={this.state.sections}
            keyExtractor={this.props.keyExtractor}
            renderItem={this.renderItem}
            renderSectionHeader={this.renderSectionHeader}
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
  sectionsMapper: PropTypes.func,
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
