use std::{
    fs::{self, File},
    io::{Read, Write},
    path::{Path, PathBuf},
};

use anyhow::{Context, Result};
use chrono::Utc;
use image::ImageReader;
use tempfile::tempdir;
use walkdir::WalkDir;
use zip::{write::SimpleFileOptions, ZipArchive, ZipWriter};

pub fn extract_archive(archive_path: &Path, target_dir: &Path) -> Result<()> {
    if target_dir.exists() {
        fs::remove_dir_all(target_dir)?;
    }
    fs::create_dir_all(target_dir)?;

    let file = File::open(archive_path)?;
    let mut archive = ZipArchive::new(file)?;
    archive.extract(target_dir)?;
    Ok(())
}

pub fn pack_archive(source_dir: &Path, target_file: &Path) -> Result<()> {
    let parent = target_file
        .parent()
        .filter(|path| !path.as_os_str().is_empty())
        .unwrap_or(source_dir);
    fs::create_dir_all(parent)?;

    let temp_path = temp_archive_path(target_file, parent);
    let file = File::create(&temp_path)?;
    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    for entry in WalkDir::new(source_dir).into_iter().filter_map(|item| item.ok()).filter(|entry| entry.file_type().is_file()) {
        let path = entry.path();
        if path == temp_path || path == target_file {
            continue;
        }
        let relative = path.strip_prefix(source_dir)?;
        zip.start_file(relative.to_string_lossy().replace('\\', "/"), options)?;
        let mut file = File::open(path)?;
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)?;
        zip.write_all(&buffer)?;
    }

    zip.finish()?;
    replace_archive_atomically(&temp_path, target_file)?;
    Ok(())
}

pub fn create_archive_backup(archive_path: &Path) -> Result<PathBuf> {
    let parent = archive_path
        .parent()
        .filter(|path| !path.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."));
    let stem = archive_path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("journal");
    let extension = archive_path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("trj");
    let backup_name = format!(
        "{stem}.backup-{}.{}",
        Utc::now().format("%Y%m%d-%H%M%S"),
        extension
    );
    let backup_path = parent.join(backup_name);
    fs::copy(archive_path, &backup_path)?;
    Ok(backup_path)
}

pub fn convert_image_to_webp(source_path: &Path, images_dir: &Path) -> Result<PathBuf> {
    fs::create_dir_all(images_dir)?;
    let temp = tempdir()?;
    let target_name = format!(
        "{}.webp",
        source_path
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or("screenshot")
    );
    let temp_target = temp.path().join(target_name);
    let image = ImageReader::open(source_path)
        .with_context(|| format!("Unable to read image at {}", source_path.display()))?
        .decode()?;
    image.save_with_format(&temp_target, image::ImageFormat::WebP)?;

    let final_name = format!(
        "{}.webp",
        uuid::Uuid::new_v4()
    );
    let final_path = images_dir.join(final_name);
    fs::copy(&temp_target, &final_path)?;
    Ok(final_path)
}

pub fn convert_image_bytes_to_webp(bytes: &[u8], images_dir: &Path, file_stem: Option<&str>) -> Result<PathBuf> {
    fs::create_dir_all(images_dir)?;
    let temp = tempdir()?;
    let target_name = format!("{}.webp", file_stem.unwrap_or("pasted-screenshot"));
    let temp_target = temp.path().join(target_name);
    let image = image::load_from_memory(bytes).context("Unable to decode pasted or uploaded image bytes")?;
    image.save_with_format(&temp_target, image::ImageFormat::WebP)?;

    let final_name = format!("{}.webp", uuid::Uuid::new_v4());
    let final_path = images_dir.join(final_name);
    fs::copy(&temp_target, &final_path)?;
    Ok(final_path)
}

fn temp_archive_path(target_file: &Path, parent: &Path) -> PathBuf {
    let file_name = target_file
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("journal.trj");
    parent.join(format!("{file_name}.tmp"))
}

fn backup_archive_path(target_file: &Path, parent: &Path) -> PathBuf {
    let file_name = target_file
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("journal.trj");
    parent.join(format!("{file_name}.bak"))
}

fn replace_archive_atomically(temp_path: &Path, target_file: &Path) -> Result<()> {
    let parent = target_file
        .parent()
        .filter(|path| !path.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."));
    let backup_path = backup_archive_path(target_file, parent);

    if backup_path.exists() {
        fs::remove_file(&backup_path)?;
    }

    if target_file.exists() {
        fs::rename(target_file, &backup_path)?;
    }

    match fs::rename(temp_path, target_file) {
        Ok(()) => {
            if backup_path.exists() {
                fs::remove_file(backup_path)?;
            }
            Ok(())
        }
        Err(error) => {
            if backup_path.exists() && !target_file.exists() {
                let _ = fs::rename(&backup_path, target_file);
            }
            if temp_path.exists() {
                let _ = fs::remove_file(temp_path);
            }
            Err(error.into())
        }
    }
}
