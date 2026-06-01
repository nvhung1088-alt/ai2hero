'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';

const VIDEO_WORKSPACE_DIR_KEY = 'ai2hero_video_workspace_dir';

type FileSystemPermissionOptions = {
  mode: 'read' | 'readwrite';
};

type WorkspaceDirectoryEntry = FileSystemFileHandle | FileSystemDirectoryHandle;

type WorkspaceDirectoryHandle = FileSystemDirectoryHandle & {
  queryPermission: (descriptor?: FileSystemPermissionOptions) => Promise<PermissionState>;
  requestPermission: (descriptor?: FileSystemPermissionOptions) => Promise<PermissionState>;
  values: () => AsyncIterableIterator<WorkspaceDirectoryEntry>;
};

type WindowWithDirectoryPicker = Window &
  typeof globalThis & {
    showDirectoryPicker?: (options?: FileSystemPermissionOptions) => Promise<WorkspaceDirectoryHandle>;
  };

type StoredWorkspaceDir = {
  workspaceSlug: string;
  handle: WorkspaceDirectoryHandle;
};

function idbGet<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('keyval-store', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('keyval');
    };
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('keyval')) {
        resolve(undefined);
        return;
      }
      const transaction = db.transaction('keyval', 'readonly');
      const store = transaction.objectStore('keyval');
      const getReq = store.get(key);
      getReq.onsuccess = () => resolve(getReq.result as T | undefined);
      getReq.onerror = () => reject(getReq.error);
    };
    request.onerror = () => reject(request.error);
  });
}

function idbSet(key: string, val: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('keyval-store', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('keyval');
    };
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('keyval', 'readwrite');
      const store = transaction.objectStore('keyval');
      const setReq = store.put(val, key);
      setReq.onsuccess = () => resolve();
      setReq.onerror = () => reject(setReq.error);
    };
    request.onerror = () => reject(request.error);
  });
}

interface FileSystemContextType {
  hasPermission: boolean;
  dirHandle: WorkspaceDirectoryHandle | null;
  requestPermission: () => Promise<void>;
  verifyExistingPermission: () => Promise<boolean>;
  getAllVideoFiles: () => Promise<File[]>;
  deleteVideoFile: (fileName: string) => Promise<boolean>;
}

const FileSystemContext = createContext<FileSystemContextType | null>(null);

export function useFileSystem() {
  const context = useContext(FileSystemContext);
  if (!context) {
    throw new Error('useFileSystem must be used within a FileSystemProvider');
  }
  return context;
}

export function FileSystemProvider({
  children,
  workspaceSlug,
}: {
  children: React.ReactNode;
  workspaceSlug: string;
}) {
  const [dirHandle, setDirHandle] = useState<WorkspaceDirectoryHandle | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  React.useEffect(() => {
    idbGet<StoredWorkspaceDir>(VIDEO_WORKSPACE_DIR_KEY)
      .then((stored) => {
        if (!stored?.handle || stored.workspaceSlug !== workspaceSlug) {
          setDirHandle(null);
          setHasPermission(false);
          return;
        }

        const handle = stored.handle;
        setDirHandle(handle);
        handle.queryPermission({ mode: 'readwrite' }).then((status: PermissionState) => {
          setHasPermission(status === 'granted');
        });
      })
      .catch((e) => console.error('IDB load error', e));
  }, [workspaceSlug]);

  const isExpectedWorkspaceFolder = useCallback(
    (handle: WorkspaceDirectoryHandle) => {
      if (handle.name === workspaceSlug) return true;
      alert(`Hay chon dung thu muc workspace: ${workspaceSlug}`);
      return false;
    },
    [workspaceSlug],
  );

  const verifyExistingPermission = useCallback(async () => {
    if (!dirHandle || !isExpectedWorkspaceFolder(dirHandle)) {
      setHasPermission(false);
      return false;
    }

    try {
      const opts: FileSystemPermissionOptions = { mode: 'readwrite' };
      if ((await dirHandle.queryPermission(opts)) === 'granted') {
        setHasPermission(true);
        return true;
      }
      if ((await dirHandle.requestPermission(opts)) === 'granted') {
        setHasPermission(true);
        return true;
      }
      setHasPermission(false);
      return false;
    } catch (err) {
      console.error(err);
      setHasPermission(false);
      return false;
    }
  }, [dirHandle, isExpectedWorkspaceFolder]);

  const requestPermission = useCallback(async () => {
    try {
      const pickerWindow = window as WindowWithDirectoryPicker;
      if (!pickerWindow.showDirectoryPicker) {
        alert('Trinh duyet cua ban khong ho tro File System Access API. Hay dung Chrome/Edge tren may tinh.');
        return;
      }

      const handle = await pickerWindow.showDirectoryPicker({ mode: 'readwrite' });
      if (!isExpectedWorkspaceFolder(handle)) return;

      setDirHandle(handle);
      setHasPermission(true);
      await idbSet(VIDEO_WORKSPACE_DIR_KEY, { workspaceSlug, handle });
    } catch (err) {
      console.error('Loi khi xin quyen thu muc:', err);
    }
  }, [isExpectedWorkspaceFolder, workspaceSlug]);

  const getAllVideoFiles = useCallback(async () => {
    if (!dirHandle) return [];

    try {
      const files: File[] = [];
      const validExtensions = ['.mp4', '.webm', '.ts', '.mov', '.mkv'];
      for await (const entry of dirHandle.values()) {
        if (entry.kind !== 'file') continue;
        const lowerName = entry.name.toLowerCase();
        if (entry.name === '_ai2hero_open_folder.txt') continue;
        if (validExtensions.some((ext) => lowerName.endsWith(ext))) {
          files.push(await entry.getFile());
        }
      }
      return files.sort((a, b) => b.lastModified - a.lastModified);
    } catch (err) {
      console.error('Error listing files:', err);
      return [];
    }
  }, [dirHandle]);

  const deleteVideoFile = useCallback(async (fileName: string) => {
    if (!dirHandle) return false;

    try {
      let targetName = fileName;
      let found = false;
      const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
      const ext = fileName.split('.').pop();

      for await (const entry of dirHandle.values()) {
        if (entry.kind !== 'file') continue;
        if (entry.name === fileName || (entry.name.startsWith(nameWithoutExt) && entry.name.endsWith(`.${ext}`))) {
          targetName = entry.name;
          found = true;
          break;
        }
      }

      if (!found) return false;
      await dirHandle.removeEntry(targetName);
      return true;
    } catch (err) {
      console.error('Loi xoa file:', err);
      return false;
    }
  }, [dirHandle]);

  return (
    <FileSystemContext.Provider
      value={{ hasPermission, dirHandle, requestPermission, verifyExistingPermission, getAllVideoFiles, deleteVideoFile }}
    >
      {children}
    </FileSystemContext.Provider>
  );
}
