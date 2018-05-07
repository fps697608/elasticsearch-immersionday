import React, { Component } from 'react';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import Paper from 'material-ui/Paper';
import TextField from 'material-ui/TextField';

import logo from './logo.svg';
import './App.css';

// TODO: Update the API URL
const API_URL = "https://4pvliu48l3.execute-api.ap-southeast-2.amazonaws.com/Prod/";

class App extends Component {
  constructor(props) {
    super(props);

    let defaultState = {
      searchText:"",
      results: [],
      result_count: 0,
      selected_result: {}
    };
    this.state = defaultState;
  }

  componentDidMount() {
    
  }

  searchTextChanged(event, newValue) {
    this.setState({searchText: newValue });
  }

  searchInputKeyPress(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      this.search();
    }
  }

  showSearchLoader() {
    this.hideSearchIdeasDiv();
    this.hideResultsDiv();
    this.hideSelectedResultDiv();
    let loadingDiv = document.getElementById("search_loading_div");
    if (loadingDiv) loadingDiv.className = "center_page";
  }
  hideSearchLoader() {
    let loadingDiv = document.getElementById("search_loading_div");
    if (loadingDiv) loadingDiv.className = "hidden";
  }

  showSearchIdeasDiv() {
    let loadingDiv = document.getElementById("search_ideas_div");
    if (loadingDiv) loadingDiv.className = "";
  }
  hideSearchIdeasDiv() {
    let loadingDiv = document.getElementById("search_ideas_div");
    if (loadingDiv) loadingDiv.className = "hidden";
  }
  

  showResultsDiv() {
    this.hideSearchLoader();
    this.hideSelectedResultDiv();
    let resDiv = document.getElementById("result_output");
    if (resDiv) {
        resDiv.className = "center_page";
    }
  }
  hideResultsDiv() {
    let resDiv = document.getElementById("result_output");
    if (resDiv) resDiv.className = "hidden";
  }

  showSelectedResultDiv() {
    this.hideSearchLoader();
    this.hideResultsDiv();
    let resDiv = document.getElementById("single_result");
    if (resDiv) {
        resDiv.className = "center_page";
    }
  }
  hideSelectedResultDiv() {
    let resDiv = document.getElementById("single_result");
    if (resDiv) resDiv.className = "hidden";
  }


  handleSearchResults(results) {
    console.log("Received Results:", results);
    this.setState( { results:results.hits, result_count:results.total } );
    this.showResultsDiv();
    if (results.total === 0) {
      this.showSearchIdeasDiv();
    }
  }

  search() {
    let self = this;
    this.showSearchLoader();
    
    let e = document.getElementById("searchbar_div");
    if (e) e.className = "filltop_page";
  
    let searchText = this.state.searchText;
    console.log("Searching for:", searchText);
    
    fetch(API_URL + "?criteria=" + encodeURIComponent(searchText))
    .then( response => {
      self.hideSearchLoader();
      if (response.status === 200) {
        return response.json();
      } else {
        console.log("Search Failed!",response.text());
        self.showSearchIdeasDiv()
        return null;
      }
    }).then( results => {
      self.handleSearchResults(results);
    }).catch( err => {
      self.hideSearchLoader();
      console.log(err);
    });
  }

  renderCharacters(characters) {
    if (!characters || characters.length === 0) return "?";
    var output;
    characters.forEach(character => {
      if (!output) {
        output = character;
      } else {
        output += ", " + character;
      }
    });
    return output;
  }
  renderActor(result, index) {
    return (
            <li key={index} >
                {result.name} <small>({ this.renderCharacters(result.characters) })</small>
            </li>
          )
  }
  renderActors(actors) {
    if (actors) {
      return actors.map(this.renderActor.bind(this));
    } else return "";
  }

  renderCrewMember(result, index) {
    return (
            <li key={index} >
                {result.name} <small>({result.job})</small>
            </li>
          )
  }
  renderCrew(crew) {
    if (crew) {
      return crew.map(this.renderCrewMember.bind(this));
    } else return "";
  }

  openResult(result) {
    this.setState( { selected_result: result });
    this.showSelectedResultDiv();
  }

  renderResult(result, index) {
    return (
            <li className="result_item" key={index} onClick={ this.openResult.bind(this, result) } >
                {result.name} 
                &nbsp;
                <span style={{fontSize:"0.8em", color:"gray"}}>{ result.releaseYear > 0 ? "(" + result.releaseYear + ")" : "" }</span>
                &nbsp;
                <span style={{fontSize:"0.4em", color:"purple"}}>[Score: { Math.round(result._score, 2) }]</span>&nbsp;
            </li>
          )
  }
  renderResults() {
    return this.state.results.map(this.renderResult.bind(this));
  }


  render() {
    const results = this.renderResults();
    return (
      <MuiThemeProvider>
      <div>
        <img src={logo} className="App-logo" alt="logo" />
        <h3 className="App-title">IMDB Movie Search</h3>

        <div id="searchbar_div" className="center_page">
          <Paper zDepth={4} className="searchInputWrapper" >
            <TextField
                id="searchInput"
                hintText="Enter a movie or TV show..."
                floatingLabelText="What are you looking for?"
                floatingLabelFixed={true}
                value={ this.state.searchText }
                fullWidth={true}
                autoFocus={true}
                onChange={ this.searchTextChanged.bind(this) }
                onKeyPress={ this.searchInputKeyPress.bind(this) }
              />
            </Paper>
        </div>

        <div id="search_ideas_div">
          <h4>Search Ideas</h4>
          <div className="indented">
            <ul>
              <li>Quick Search: <pre className="indented">benjamin button</pre></li>
              <li>Movie with Name in Year: <pre className="indented">releaseYear:2016 AND name:"star wars"</pre></li>
              <li>Movie by Actor in Year: <pre className="indented">actors.name:"Brad Pitt" AND releaseYear:2013</pre></li>
              <li>Highly Rated Brad Pitt Movies: <pre className="indented">rating:[8 TO *] AND actors.name:"Brad Pitt"</pre></li>
              <li>Short Movies: <pre className="indented">runtimeMins:[* TO 80]</pre></li>              
            </ul>
          </div>

          <div className="bottomRight">
            <h4>Common Search Fields</h4>
            <ul>
              <li><b>name</b>:&nbsp;Movie Title</li>
              <li><b>releaseYear</b>:&nbsp;Release Year</li>
              <li><b>rating</b>:&nbsp;Peoples Rating (out of 10)</li>
              <li><b>actors.name</b>:&nbsp;Actor Name</li>
              <li><b>actors.characters</b>:&nbsp;Character in Movie</li>
              <li><b>crew.name</b>:&nbsp;Crew Members Name</li>
              <li><b>crew.job</b>:&nbsp;Crew Members Job</li>
              <li><b>runtimeMins</b>:&nbsp;Movie Running time (in mins)</li>
            </ul>
          </div>
        </div>

        <div id="search_loading_div" className="hidden">
          <img className="isSearchingImg" src="/search-loading.gif" alt="searching..."/>
          <br />
          <span className="isSearchingLabel">We're searching...</span>
        </div>

        <div id="result_output" className="hidden">
          <span className="resultCountLabel" >Results Found: {this.state.result_count } </span>
          <ul className="result_list">{ results }</ul>
        </div>

        <div id="single_result" className="hidden">
          <h2 className="resultHeading">{ this.state.selected_result.name }</h2>
          <p className="originalNameLabel">Original Name: { this.state.selected_result.originalName }</p>
          <div className="result_rightPanel">
            <p className="ratingLabel">
              Rating: <b>{ Math.ceil(this.state.selected_result.rating*10) }% </b>
            </p>
            <p className="releaseYearLabel">Released: <b>{ this.state.selected_result.releaseYear } </b></p>
            <p className="runtimeMinsLabel">Runtime: <b>{ this.state.selected_result.runtimeMins } mins </b></p>
          </div>

          <h5>Crew</h5>
          <ul>
            { this.renderCrew(this.state.selected_result.crew)}
          </ul>

          <h5>Actors</h5>
          <ul>
          { this.renderActors(this.state.selected_result.actors)}
          </ul>

        </div>
      </div>
      </MuiThemeProvider>
    );
  }
}

export default App;
