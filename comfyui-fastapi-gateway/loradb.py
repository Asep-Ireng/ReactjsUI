import os
import base64
from typing import Optional

import psycopg2
from psycopg2 import sql
import re  # For more complex pattern matching if needed

# --- ⚙️ CONFIGURATION - YOU NEED TO SET THESE! ⚙️ ---
LORA_BASE_DIR = r"P:\Kuliah Rui\AI\ComfyUI\ComfyUI_windows_portable\ComfyUI\models\loras"

MODEL_BASE_DIR = r"P:\Kuliah Rui\AI\ComfyUI\ComfyUI_windows_portable\ComfyUI\models\checkpoints\thumb"
""

DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "react_ui_ai_db"
DB_USER = "postgres"
DB_PASSWORD = "root"


# --- End Configuration ---

def get_image_as_base64(file_path):
    """Reads an image file and returns it as a data URI base64 string."""
    try:
        with open(file_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        ext = os.path.splitext(file_path)[1].lower()
        mime_type = "image/png"  # Default
        if ext == ".jpg" or ext == ".jpeg":
            mime_type = "image/jpeg"
        elif ext == ".webp":
            mime_type = "image/webp"
        return f"data:{mime_type};base64,{encoded_string}"
    except FileNotFoundError:
        print(f"  - Error: Thumbnail file not found at {file_path}")
        return None
    except Exception as e:
        print(f"  - Error converting image {file_path} to base64: {e}")
        return None


def determine_lora_base_model(lora_db_key: str, lora_full_path: str) -> Optional[str]:
    """
    Determines the base model category from the LoRA's parent directory (category folder).
    lora_db_key is like "CategoryName/LoraName.safetensors"
    """
    try:
        path_parts = lora_db_key.replace('\\', '/').split('/')
        if len(path_parts) > 1:
            base_model_category = path_parts[0]
            # Normalize common names
            cat_lower = base_model_category.lower()
            if cat_lower in ["sd1.5", "sd15", "stable diffusion 1.5", "sd1"]: return "SD1.5"
            if cat_lower in ["sdxl", "sd xl", "stable diffusion xl"]: return "SDXL"
            if cat_lower in ["pony", "sdxl pony"]: return "Pony"
            # Add other known categories from your folder names (e.g., "illustrious", "naixl")
            if cat_lower in ["illustrious"]: return "Illustrious"  # Or map to a base like SDXL if appropriate
            if cat_lower in ["naixl"]: return "NAIXL"  # Or map to a base like SDXL
            if cat_lower in ["general"]: return "General"  # Or map to a base like general
            return base_model_category  # Return the folder name as is if not a known alias
        else:  # LoRA directly in LORA_BASE_DIR (no category subfolder)
            lora_name_lower = lora_db_key.lower()  # lora_db_key is just filename here
            if "sdxl" in lora_name_lower: return "SDXL"
            if "sd15" in lora_name_lower or "sd1.5" in lora_name_lower: return "SD1.5"
            if "pony" in lora_name_lower: return "Pony"
            return "Unknown"
    except Exception as e:
        print(f"  - Error determining base model for LoRA {lora_db_key}: {e}")
        return "Unknown"


def find_lora_thumbnail(lora_full_path: str, lora_base_dir: str) -> Optional[str]:
    """
    Finds a thumbnail for a LoRA.
    Structure: LORA_BASE_DIR/Category/MyLora.safetensors
               LORA_BASE_DIR/Category/thumb/MyLora.png (or .jpg, .webp)
    """
    try:
        lora_filename_no_ext = os.path.splitext(os.path.basename(lora_full_path))[0]
        # lora_full_path = C:\...\loras\Category\MyLora.safetensors
        # category_dir_path = C:\...\loras\Category
        category_dir_path = os.path.dirname(lora_full_path)

        thumb_dir_path = os.path.join(category_dir_path, "thumb")

        if os.path.isdir(thumb_dir_path):
            for ext in ['.png', '.jpg', '.jpeg', '.webp']:
                potential_thumb_name = lora_filename_no_ext + ext
                thumb_path = os.path.join(thumb_dir_path, potential_thumb_name)
                if os.path.exists(thumb_path):
                    print(f"  + Found LoRA thumbnail: {thumb_path}")
                    return thumb_path
            # Fallback: if thumb has a slightly different name but is the only image
            images_in_thumb_dir = [f for f in os.listdir(thumb_dir_path) if
                                   f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))]
            if len(images_in_thumb_dir) == 1:
                thumb_path = os.path.join(thumb_dir_path, images_in_thumb_dir[0])
                print(f"  + Found single LoRA thumbnail (fallback in category/thumb): {thumb_path}")
                return thumb_path
        else:
            print(f"  - Expected LoRA thumb directory not found: {thumb_dir_path}")

        print(f"  - LoRA thumbnail not found for {lora_full_path}")
        return None
    except Exception as e:
        print(f"  - Error in find_lora_thumbnail for {lora_full_path}: {e}")
        return None


def find_model_thumbnail(model_full_path: str, model_base_dir: str) -> Optional[str]:
    """
    Finds a thumbnail for a checkpoint model.
    ASSUMPTION: Thumbnail is a sibling to the model file, in the same category directory.
    e.g., Model: MODEL_BASE_DIR/Category/MyModel.safetensors
          Thumb: MODEL_BASE_DIR/Category/MyModel.png
    """
    try:
        model_filename_no_ext = os.path.splitext(os.path.basename(model_full_path))[0]
        model_actual_dir = os.path.dirname(model_full_path)  # This is .../checkpoints/Category/

        for ext in ['.png', '.jpg', '.jpeg', '.webp']:
            potential_thumb_name = model_filename_no_ext + ext
            thumb_path = os.path.join(model_actual_dir, potential_thumb_name)
            if os.path.exists(thumb_path) and model_full_path != thumb_path:
                return thumb_path

        images_in_model_dir = [f for f in os.listdir(model_actual_dir) if
                               f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))]
        images_in_model_dir = [f for f in images_in_model_dir if os.path.join(model_actual_dir, f) != model_full_path]
        if len(images_in_model_dir) == 1:
            return os.path.join(model_actual_dir, images_in_model_dir[0])
        return None
    except Exception as e:
        print(f"  - Error in find_model_thumbnail for {model_full_path}: {e}")
        return None


def process_directory(conn, base_dir, table_name, item_type_name="LoRA"):
    cursor = conn.cursor()
    print(f"\nProcessing {item_type_name}s in {base_dir}...")
    print(f"\nProcessing {item_type_name}s in {base_dir}...")
    print(f"DEBUG [{item_type_name}]: Verifying base_dir exists: {os.path.exists(base_dir)}")  # ESSENTIAL

    items_processed_count = 0
    thumbnails_found_count = 0

    for root, dirs, files in os.walk(base_dir):
        # Skip 'thumb' directories when looking for model/LoRA files themselves
        # THESE PRINTS ARE KEY FOR DEBUGGING THE MODEL PART
        if item_type_name == "Model":
            print(f"DEBUG [Model Walk]: Visiting root: {root}")
            print(f"DEBUG [Model Walk]: Dirs found in this root: {dirs}")
            print(f"DEBUG [Model Walk]: Files found in this root: {files}")

        if os.path.basename(root).lower() == "thumb" and os.path.normpath(root) != os.path.normpath(base_dir):
            if item_type_name == "Model":  # Or simply a general print if you prefer
                print(
                    f"DEBUG [Walk]: Skipping 'thumb' SUBdirectory: {root} (because it's a child folder named 'thumb')")
            dirs[:] = []  # Don't go deeper into this 'thumb' subdirectory
            continue

        for file in files:
            if file.lower().endswith(('.safetensors', '.ckpt', '.pt')):
                items_processed_count += 1
                item_full_path = os.path.join(root, file)
                item_db_key = os.path.relpath(item_full_path, base_dir).replace('\\', '/')

                print(f"Found {item_type_name}: {item_db_key}")

                thumbnail_file_path = None
                compatible_model_for_lora = None  # Specific to LoRAs

                if item_type_name == "LoRA":
                    thumbnail_file_path = find_lora_thumbnail(item_full_path, base_dir)
                    compatible_model_for_lora = determine_lora_base_model(item_db_key, item_full_path)
                    if compatible_model_for_lora:
                        print(f"  -> Determined base model for LoRA: {compatible_model_for_lora}")
                    else:
                        print(f"  -> Base model undetermined for LoRA: {item_db_key}")
                elif item_type_name == "Model":
                    thumbnail_file_path = find_model_thumbnail(item_full_path, base_dir)
                    # Checkpoint models don't have 'compatible_base_model' in their table in this setup

                base64_data = None
                if thumbnail_file_path:
                    thumbnails_found_count += 1
                    base64_data = get_image_as_base64(thumbnail_file_path)

                # Upsert logic
                name_column = 'lora_name' if table_name == 'lora_thumbnails' else 'model_name'
                try:
                    if table_name == 'lora_thumbnails':
                        # For LoRAs, always try to insert/update, even if only base model info is available
                        if base64_data:  # Thumbnail found
                            query_template = """
                                             INSERT INTO lora_thumbnails (lora_name, thumbnail_base64, compatible_base_model, updated_at)
                                             VALUES (%s, %s, %s, CURRENT_TIMESTAMP) ON CONFLICT (lora_name) DO \
                                             UPDATE SET
                                                 thumbnail_base64 = EXCLUDED.thumbnail_base64, \
                                                 compatible_base_model = EXCLUDED.compatible_base_model, \
                                                 updated_at = CURRENT_TIMESTAMP; \
                                             """
                            cursor.execute(sql.SQL(query_template),
                                           (item_db_key, base64_data, compatible_model_for_lora))
                        elif compatible_model_for_lora:  # No thumbnail, but base model info exists
                            print(f"  - No thumbnail for LoRA {item_db_key}, storing base model info only.")
                            query_template = """
                                             INSERT INTO lora_thumbnails (lora_name, compatible_base_model, updated_at)
                                             VALUES (%s, %s, CURRENT_TIMESTAMP) ON CONFLICT (lora_name) DO \
                                             UPDATE SET
                                                 compatible_base_model = EXCLUDED.compatible_base_model, \
                                                 updated_at = CURRENT_TIMESTAMP;
                                             -- Optionally, add WHERE lora_thumbnails.thumbnail_base64 IS NULL if you don't want to overwrite existing thumbs with NULL \
                                             """
                            cursor.execute(sql.SQL(query_template), (item_db_key, compatible_model_for_lora))
                        # If neither thumbnail nor base_model, do nothing for LoRA from this script for now

                    elif table_name == 'model_thumbnails' and base64_data:  # Only insert/update models if thumbnail found
                        query_template = """
                                         INSERT INTO model_thumbnails (model_name, thumbnail_base64, updated_at)
                                         VALUES (%s, %s, CURRENT_TIMESTAMP) ON CONFLICT (model_name) DO \
                                         UPDATE SET
                                             thumbnail_base64 = EXCLUDED.thumbnail_base64, \
                                             updated_at = CURRENT_TIMESTAMP; \
                                         """
                        cursor.execute(sql.SQL(query_template), (item_db_key, base64_data))

                    conn.commit()
                except Exception as e:
                    print(f"  - DB Error for {item_db_key}: {e}")
                    conn.rollback()

    print(
        f"Finished processing {item_type_name}s. Total items scanned: {items_processed_count}. Thumbnails found and processed: {thumbnails_found_count}.")
    cursor.close()


# --- Main Execution Block ---
if __name__ == "__main__":
    conn = None
    try:
        print("Attempting to connect to PostgreSQL...")
        conn = psycopg2.connect(
            host=DB_HOST, port=DB_PORT, database=DB_NAME,
            user=DB_USER, password=DB_PASSWORD
        )
        print(f"Successfully connected to PostgreSQL database '{DB_NAME}' as user '{DB_USER}'.")

        process_directory(conn, LORA_BASE_DIR, "lora_thumbnails", "LoRA")
        process_directory(conn, MODEL_BASE_DIR, "model_thumbnails", "Model")

    except psycopg2.Error as e:
        print(f"PostgreSQL connection or operational error: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
    finally:
        if conn:
            conn.close()
            print("Database connection closed.")