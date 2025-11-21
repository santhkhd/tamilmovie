import json
import requests
import time
from urllib.parse import quote_plus

# List of API keys to rotate through (using the valid key we found)
API_KEYS = [
    "b5c868a4",  # Valid key found in update_2025_movies.py
    "e8839cc3",
    "c459749d",
    "e43e073e",
    "86fe17c",
    "b34e386c",
    "6c2d2f59",
    "e6514a3a",
    "1916b9ca"
]

def fetch_movie_cast(movie_title, movie_year=None, api_key_index=0):
    """
    Fetch cast information for a movie using OMDB API
    Only returns cast data, nothing else
    """
    # Using rotating API keys
    api_key = API_KEYS[api_key_index % len(API_KEYS)]
    
    # Construct the API URL
    if movie_year:
        url = f"http://www.omdbapi.com/?t={quote_plus(movie_title)}&y={movie_year}&apikey={api_key}&type=movie"
    else:
        url = f"http://www.omdbapi.com/?t={quote_plus(movie_title)}&apikey={api_key}&type=movie"
    
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            if data.get('Response') == 'True':
                # Extract cast information only
                cast = data.get('Actors', '')
                cast_list = []
                if cast and cast != 'N/A':
                    # Split cast into a list
                    cast_list = [actor.strip() for actor in cast.split(',')]
                
                return {
                    'cast': cast_list
                }
            else:
                # Movie not found
                print(f"  Movie not found in OMDB: {data.get('Error', 'Unknown error')}")
                return None
        # Check if we hit the API limit
        elif response.status_code == 429:
            print(f"API limit reached for key {api_key}.")
            return "LIMIT_REACHED"
        else:
            print(f"HTTP Error {response.status_code} for {movie_title} with key {api_key}")
            # If it's an authentication error (401), try the next key
            if response.status_code == 401:
                return "LIMIT_REACHED"
            return None
    except Exception as e:
        print(f"Error fetching data for {movie_title}: {e}")
        return None

def update_movies_with_details(input_file, output_file, delay=1, max_requests=None):
    """
    Update movies JSON file with cast information only
    Processes movies in descending order by year
    Uses multiple API keys, switching to next key when limit is reached
    Only updates cast field, preserves all other fields
    """
    # Load the existing movies data
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            movies = json.load(f)
    except FileNotFoundError:
        print(f"Error: File {input_file} not found.")
        return
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON in file {input_file}.")
        return
    
    # Sort movies by year in descending order (newest first)
    movies.sort(key=lambda x: x.get('year', '') or '', reverse=True)
    
    print(f"Loaded {len(movies)} movies from {input_file}")
    
    if max_requests is None:
        max_requests = len(movies)  # Process all movies if no limit specified
    
    print(f"Will process up to {max_requests} movies using {len(API_KEYS)} API keys")
    print("Only updating cast information, preserving all other fields")
    
    # Process movies
    updated_movies = []
    requests_made = 0
    current_api_key_index = 0
    skipped_count = 0
    
    for i, movie in enumerate(movies):
        if requests_made >= max_requests:
            print(f"Reached request limit of {max_requests}. Stopping processing.")
            # Add the remaining movies without updating them
            updated_movies.extend(movies[i:])
            break
            
        print(f"Processing {i+1}/{len(movies)}: {movie.get('title', 'Unknown Title')} ({movie.get('year', 'Unknown Year')}) with API key {current_api_key_index + 1}")
        
        # Skip if cast already exists and has members
        if 'cast' in movie and movie['cast'] and len(movie['cast']) > 0:
            print(f"  Cast already exists ({len(movie['cast'])} members), skipping...")
            updated_movies.append(movie)
            skipped_count += 1
            continue
        
        # Fetch movie cast details
        title = movie.get('title', '')
        year = movie.get('year', '')
        
        if title:
            details = fetch_movie_cast(title, year, current_api_key_index)
            
            # Handle API limit reached or authentication errors
            while details == "LIMIT_REACHED":
                # Switch to the next API key
                current_api_key_index = (current_api_key_index + 1) % len(API_KEYS)
                print(f"Switching to API key {current_api_key_index + 1}: {API_KEYS[current_api_key_index]}")
                details = fetch_movie_cast(title, year, current_api_key_index)
                
                # If all keys have been exhausted, stop processing
                if current_api_key_index == 0:
                    print("All API keys have reached their limits. Saving progress and stopping.")
                    # Add the remaining movies without updating them
                    updated_movies.extend(movies[i:])
                    break
            
            # Check if we've exhausted all API keys
            if details == "LIMIT_REACHED":
                break
                
            if details and details.get('cast'):
                # Only update cast field
                movie['cast'] = details['cast']
                print(f"  Found {len(details['cast'])} cast members: {', '.join(details['cast'][:3])}{'...' if len(details['cast']) > 3 else ''}")
                requests_made += 1
            else:
                print(f"  No cast information found")
                # Ensure cast field exists
                if 'cast' not in movie:
                    movie['cast'] = []
                
        else:
            print(f"  No title found, skipping...")
            # Ensure cast field exists
            if 'cast' not in movie:
                movie['cast'] = []
        
        updated_movies.append(movie)
        
        # Add delay to avoid overwhelming the API
        if i < len(movies) - 1 and requests_made < max_requests:  # Don't delay after the last item
            time.sleep(delay)
            
            # Periodically save progress (every 50 movies)
            if requests_made > 0 and requests_made % 50 == 0:
                try:
                    with open(output_file, 'w', encoding='utf-8') as f:
                        json.dump(updated_movies + movies[i+1:], f, indent=2, ensure_ascii=False)
                    print(f"  Progress saved: {requests_made} movies processed, {skipped_count} skipped")
                except Exception as e:
                    print(f"  Error saving progress: {e}")
    
    # Save the final updated data
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(updated_movies, f, indent=2, ensure_ascii=False)
        print(f"\nUpdated movies data saved to {output_file}")
        print(f"Successfully processed {requests_made} movies")
        print(f"Skipped {skipped_count} movies (cast already exists)")
        print(f"Made {requests_made} API requests")
    except Exception as e:
        print(f"Error saving file: {e}")

# Run the update
if __name__ == "__main__":
    print("Starting Tamil Movies Cast Update...")
    print(f"Using {len(API_KEYS)} API Keys: {', '.join(API_KEYS)}")
    print("Processing movies in descending order by year")
    print("Only updating cast information, preserving all other fields")
    print("Switching to next API key when limit is reached")
    print("=" * 50)
    update_movies_with_details("imdb_tamil_movies_with_cast.json", "imdb_tamil_movies_with_cast.json")
